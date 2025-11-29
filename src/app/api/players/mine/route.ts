import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Player } from '@/lib/types';
import { stGetPlayersMine } from '@/lib/spacetime/api';

export const runtime = 'nodejs';

// GET /api/players/mine?fid=123
export async function GET(req: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(req.url);
    const fidParam = searchParams.get('fid');
    const fid = fidParam ? parseInt(fidParam, 10) : 250704; // dev default

    const players: Player[] = await stGetPlayersMine(fid);

    return NextResponse.json(
      { players },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=120' } }
    );
  } catch (error) {
    console.error('players/mine error', error);
    return NextResponse.json({ error: 'Failed to load players' }, { status: 500 });
  }
}
