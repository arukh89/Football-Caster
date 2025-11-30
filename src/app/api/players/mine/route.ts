import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Player } from '@/lib/types';
import { stGetPlayersMine } from '@/lib/spacetime/api';
import { requireAuth } from '@/lib/middleware/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/players/mine?fid=123
async function handler(_req: NextRequest, ctx: { fid: number }): Promise<Response> {
  try {
    const players: Player[] = await stGetPlayersMine(ctx.fid);

    return NextResponse.json(
      { players },
      { headers: { 'Cache-Control': 'private, no-store, no-cache, must-revalidate' } }
    );
  } catch (error) {
    console.error('players/mine error', error);
    return NextResponse.json({ error: 'Failed to load players' }, { status: 500 });
  }
}

export const GET = requireAuth(handler);
