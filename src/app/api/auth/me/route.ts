/**
 * GET /api/auth/me
 * Resolve the currently authenticated Farcaster user via Quick Auth JWT
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createQuickAuthClient } from '@farcaster/quick-auth';

export const runtime = 'nodejs';

function getBearer(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim();
}

function getDomain(req: NextRequest): string {
  // Prefer forwarded host in proxied deployments
  const xfHost = req.headers.get('x-forwarded-host');
  const host = (xfHost || req.headers.get('host') || '').trim();
  // Normalize to host only (strip protocol if any)
  return host.replace(/^https?:\/\//, '');
}

export async function GET(req: NextRequest): Promise<Response> {
  try {
    const token = getBearer(req);
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 401 });
    }

    const domain = getDomain(req);
    const qa = createQuickAuthClient();
    const payload = await qa.verifyJwt({ token, domain });

    return NextResponse.json({ fid: payload.sub, iss: payload.iss, aud: payload.aud, iat: payload.iat, exp: payload.exp });
  } catch (err) {
    console.error('QuickAuth verify error:', err);
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}
