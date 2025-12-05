import { NextResponse } from 'next/server';
import { getSpacetime } from '@/lib/spacetime/client';
import { stNpcUpdateState } from '@/lib/spacetime/api';
import { executeNpcTick, executeSquadTick } from '@/lib/npc/brain';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  if (process.env.NPC_ENABLED !== 'true') {
    return new NextResponse('npc disabled', { status: 204 });
  }

  const st = await getSpacetime();
  const now = Date.now();
  const dueNpcs: any[] = [];
  for (const n of st.db.npcRegistry.iter() as Iterable<any>) {
    if (n.active && Number(n.nextDecisionAtMs) <= now) dueNpcs.push(n);
  }
  // Process up to 25 NPCs per tick
  for (const n of dueNpcs.slice(0, 25)) {
    try {
      await executeNpcTick({ npc: n });
      const next = now + 60_000; // +1m default cooldown
      await stNpcUpdateState(Number(n.npcFid), next, n.budgetFbcWei);
    } catch (e) {
      console.warn('npc tick error', e);
    }
  }

  // Optionally squads
  const dueSquads: any[] = [];
  for (const s of st.db.squadRegistry.iter() as Iterable<any>) {
    if (s.active) dueSquads.push(s);
  }
  for (const s of dueSquads.slice(0, 10)) {
    try { await executeSquadTick({ squad: s }); } catch {}
  }

  return NextResponse.json({ ok: true, processed: dueNpcs.length, now });
}
