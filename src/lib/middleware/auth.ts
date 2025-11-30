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
      } catch {}
      return { fid, wallet };
    } catch {
      // Fallback: accept token as plain fid:wallet in dev
      const [fidStr, wallet] = token.split(':');
      const fidNum = parseInt(fidStr || '', 10);
      if (!Number.isNaN(fidNum) && wallet) return { fid: fidNum, wallet };
    }
  }

  // Dev fallback
  const devFid = parseInt(process.env.NEXT_PUBLIC_DEV_FID || '250704', 10);
  if (Number.isFinite(devFid)) {
    return { fid: devFid, wallet: '0xdev' } as AuthContext;
  }
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
