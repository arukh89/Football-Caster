/**
 * Authentication Middleware
 */

import { type NextRequest, NextResponse } from 'next/server';

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
    // Temporary: accept token as plain fid:wallet for dev
    const [fidStr, wallet] = token.split(':');
    const fidNum = parseInt(fidStr || '', 10);
    if (!Number.isNaN(fidNum) && wallet) return { fid: fidNum, wallet };
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
