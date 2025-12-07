/**
 * GET /api/auth/me
 * Resolve the currently authenticated Farcaster user
 * - In Farcaster: uses QuickAuth JWT via authenticate()
 * - In development: falls back to dev identity when enabled
 */

import { type NextRequest } from 'next/server';
import { authenticate } from '@/lib/middleware/auth';
import { ok, unauthorized, withErrorHandling, cache } from '@/lib/api/http';

export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<Response> {
  return withErrorHandling(async () => {
    const ctx = await authenticate(req);
    if (!ctx) return unauthorized();
    return ok({ fid: ctx.fid, wallet: ctx.wallet }, { headers: cache.privateNoStore });
  });
}
