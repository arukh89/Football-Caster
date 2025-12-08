/**
 * Authentication Middleware
 */

import { type NextRequest } from 'next/server';
import { unauthorized } from '@/lib/api/http';
import { createClient as createQuickAuthClient } from '@farcaster/quick-auth';
import { stGetUser } from '@/lib/spacetime/api';

export interface AuthContext {
  fid: number;
  wallet: string;
}

/**
 * Extract session token from request
 */
function getToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

function getOrigin(req: NextRequest): string {
  const xfProto = (req.headers.get('x-forwarded-proto') || '').trim();
  const xfHost = (req.headers.get('x-forwarded-host') || '').trim();
  const host = (xfHost || req.headers.get('host') || '').trim().replace(/^https?:\/\//, '');
  const proto = xfProto || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  return `${proto}://${host}`;
}

/**
 * Authenticate request and return user context
 */
export async function authenticate(req: NextRequest): Promise<AuthContext | null> {
  // Check for dev fallback first in development mode
  const devFallbackEnabled = process.env.NODE_ENV !== 'production' && (process.env.ENABLE_DEV_FALLBACK !== 'false');
  
  // If in development and no auth headers, use dev fallback immediately
  const token = getToken(req);
  const fidHeader = req.headers.get('x-fid') || req.headers.get('x-warpcast-user-fid');
  const walletHeader = req.headers.get('x-wallet');
  
  // Check for explicit FID headers (allows client override)
  if (fidHeader) {
    const fid = parseInt(fidHeader, 10);
    if (Number.isFinite(fid)) {
      return { 
        fid, 
        wallet: walletHeader || '0xdev' 
      };
    }
  }
  
  // Development fallback when no token is provided
  if (devFallbackEnabled && !token) {
    const devFid = parseInt(process.env.NEXT_PUBLIC_DEV_FID || '250704', 10);
    console.warn('[Auth] Using dev fallback FID:', devFid);
    return { fid: devFid, wallet: '0xdev' };
  }

  if (token) {
    // Robust QuickAuth verification with domain candidates to handle Vercel/custom-domain nuances
    const qa = createQuickAuthClient();
    const origin = getOrigin(req);

    const add = (arr: string[], v?: string) => { if (v && !arr.includes(v)) arr.push(v); };
    const candidates: string[] = [];
    const host = origin.replace(/^https?:\/\//, '');
    const envUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || process.env.FRONTEND_URL;

    // Primary + variants
    add(candidates, origin);                  // https://domain.tld
    add(candidates, host);                    // domain.tld (some libs accept host-only)
    add(candidates, `https://${host}`);       // ensure https variant
    if (host.startsWith('www.')) add(candidates, `https://${host.slice(4)}`);
    else add(candidates, `https://www.${host}`);

    // Env-configured public URL variants
    if (envUrl) {
      try {
        const u = new URL(envUrl);
        const envOrigin = `${u.protocol}//${u.host}`;
        const envHost = u.host;
        add(candidates, envOrigin);
        add(candidates, envHost);
        add(candidates, `https://${envHost}`);
      } catch {}
    }

    let payload: any = null;
    let lastErr: unknown = null;
    for (const dom of candidates) {
      try {
        payload = await qa.verifyJwt({ token, domain: dom as any });
        if (payload) break;
      } catch (e) {
        lastErr = e;
        continue;
      }
    }
    if (payload) {
      const fid = Number(payload.sub);
      let wallet = '0xdev';
      try {
        const user = await stGetUser(fid);
        if (user?.wallet) wallet = String(user.wallet).toLowerCase();
      } catch (e) {
        console.error('stGetUser failed', e);
      }
      return { fid, wallet };
    }

    // Only allow dev fallback in non-production when enabled (default true in development)
    const devFallbackEnabled = process.env.NODE_ENV !== 'production' && (process.env.ENABLE_DEV_FALLBACK !== 'false');
    if (devFallbackEnabled) {
      const [fidStr, wallet] = token.split(':');
      const fidNum = parseInt(fidStr || '', 10);
      if (!Number.isNaN(fidNum) && wallet) return { fid: fidNum, wallet };
    }
    console.error('JWT verification failed for all domain candidates:', { candidates, error: String(lastErr || 'unknown') });
    return null;
  }

  // SECURITY: Explicitly block dev fallback in production
  if (process.env.NODE_ENV === 'production') {
    return null;
  }
  
  // Dev fallback - enabled by default in development (can be disabled with ENABLE_DEV_FALLBACK=false)
  if (process.env.ENABLE_DEV_FALLBACK !== 'false') {
    const devFid = parseInt(process.env.NEXT_PUBLIC_DEV_FID || '250704', 10);
    if (Number.isFinite(devFid)) {
      console.warn('Using dev fallback FID:', devFid);
      return { fid: devFid, wallet: '0xdev' } as AuthContext;
    }
  }

  // In production, no token means unauthorized
  return null;
}

/**
 * Require authentication (middleware wrapper)
 */
export function requireAuth(
  handler: (req: NextRequest, ctx: AuthContext) => Promise<Response>
): (req: NextRequest) => Promise<Response> {
  return async (req: NextRequest): Promise<Response> => {
    const ctx = await authenticate(req);

    if (!ctx) {
      return unauthorized('Unauthorized');
    }

    return handler(req, ctx);
  };
}

/**
 * Check if user is dev FID (exemptions)
 */
export function isDevFID(fid: number): boolean {
  const devFid = parseInt(process.env.NEXT_PUBLIC_DEV_FID || '250704', 10);
  return fid === devFid;
}

/**
 * Admin check via env ADMIN_FIDS (comma-separated list of FIDs)
 */
export function isAdminFID(fid: number): boolean {
  const list = (process.env.ADMIN_FIDS || '')
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n));
  return list.includes(fid);
}
