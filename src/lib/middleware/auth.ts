/**
 * Authentication Middleware
 */

import { type NextRequest, NextResponse } from 'next/server';
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

function getDomain(req: NextRequest): string {
  const xfHost = req.headers.get('x-forwarded-host');
  const host = (xfHost || req.headers.get('host') || '').trim();
  return host.replace(/^https?:\/\//, '');
}

/**
 * Authenticate request and return user context
 */
export async function authenticate(req: NextRequest): Promise<AuthContext | null> {
  const token = getToken(req);
  const fidHeader = req.headers.get('x-fid');
  const walletHeader = req.headers.get('x-wallet');

  if (fidHeader && walletHeader) {
    return { fid: parseInt(fidHeader, 10), wallet: walletHeader };
  }

  if (token) {
    // First: try Quick Auth JWT verification
    try {
      const qa = createQuickAuthClient();
      const payload = await qa.verifyJwt({ token, domain: getDomain(req) });
      const fid = Number(payload.sub);
      let wallet = '0xdev';
      try {
        const user = await stGetUser(fid);
        if (user?.wallet) wallet = String(user.wallet).toLowerCase();
      } catch (e) {
        console.error('stGetUser failed', e);
      }
      return { fid, wallet };
    } catch (error) {
      // Only allow dev fallback in non-production when enabled (default true in development)
      const devFallbackEnabled = process.env.NODE_ENV !== 'production' && (process.env.ENABLE_DEV_FALLBACK !== 'false');
      if (devFallbackEnabled) {
        const [fidStr, wallet] = token.split(':');
        const fidNum = parseInt(fidStr || '', 10);
        if (!Number.isNaN(fidNum) && wallet) return { fid: fidNum, wallet };
      }
      // Otherwise unauthorized
      console.error('JWT verification failed:', error);
      return null;
    }
  }

  // SECURITY: Explicitly block dev fallback in production
  if (process.env.NODE_ENV === 'production') {
    return null;
  }
  
  // Dev fallback - enabled by default in development (can be disabled with ENABLE_DEV_FALLBACK=false)
  if (process.env.ENABLE_DEV_FALLBACK !== 'false') {
    const devFid = parseInt(process.env.NEXT_PUBLIC_DEV_FID || '250704', 10);
    const devWallet = String(
      (process.env.DEV_WALLET || process.env.NEXT_PUBLIC_DEV_WALLET || '0xdev')
    ).toLowerCase();
    if (Number.isFinite(devFid)) {
      console.warn('Using dev fallback FID:', devFid, 'wallet:', devWallet);
      return { fid: devFid, wallet: devWallet } as AuthContext;
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
