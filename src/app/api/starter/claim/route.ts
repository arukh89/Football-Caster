import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { stHasClaimedStarter, stGrantStarterPack } from '@/lib/spacetime/api';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as { fid?: number; amountWei?: string };
    const fid = body.fid ?? 250704; // dev default

    // Generate 18 players (11 + 7) with attributes
    const positions: Array<'GK' | 'DEF' | 'MID' | 'FWD'> = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'DEF', 'MID', 'MID', 'FWD', 'DEF', 'MID', 'FWD'];
    const names = ['Adam','Ben','Chris','David','Evan','Finn','George','Harry','Ivan','Jack','Kyle','Liam','Mason','Noah','Owen','Paul','Quinn','Ryan','Sam','Tom','Uma','Victor','Will'];

    const players = positions.slice(0, 18).map((pos, i) => {
      const rating = 65 + Math.floor(Math.random() * 20);
      const base = () => 50 + Math.floor(Math.random() * 40);
      return {
        playerId: `starter-${fid}-${randomUUID()}`,
        name: `${names[i % names.length]} ${100 + Math.floor(Math.random() * 900)}`,
        position: pos,
        rating,
        attributes: {
          pace: base(),
          shooting: base(),
          passing: base(),
          dribbling: base(),
          defending: base(),
          physical: base(),
        },
      };
    });

    // Enforce once-per-lifetime
    const already = await stHasClaimedStarter(fid);
    if (already) {
      return NextResponse.json({ error: 'Starter already claimed' }, { status: 400 });
    }

    // Transform to snake_case payload expected by reducers/lib.rs
    const payload = players.map((p) => ({
      player_id: p.playerId,
      name: p.name ?? null,
      position: p.position ?? null,
      rating: p.rating,
    }));

    await stGrantStarterPack(fid, payload);

    return NextResponse.json({ players }, { status: 200 });
  } catch (error) {
    console.error('Starter claim error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
