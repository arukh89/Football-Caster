/**
 * GET /api/starter/status
 * Returns whether the current user has claimed the starter pack
 */

import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { stHasClaimedStarter } from '@/lib/spacetime/api';

export const runtime = 'nodejs';

async function handler(_req: NextRequest, ctx: { fid: number }): Promise<Response> {
  try {
    const hasClaimed = await stHasClaimedStarter(ctx.fid);
    return NextResponse.json({ hasClaimed });
  } catch (error) {
    console.error('Starter status error:', error);
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}

export const GET = requireAuth(handler);
