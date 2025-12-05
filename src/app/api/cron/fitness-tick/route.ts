import { NextResponse } from 'next/server';
import { stPlayerStateRecoverTick, stPlayerAgeTick } from '@/lib/spacetime/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const now = Date.now();
  try {
    await stPlayerStateRecoverTick(now);
    if (process.env.PLAYER_AGE_TICK === 'true') {
      await stPlayerAgeTick();
    }
    return NextResponse.json({ ok: true, now });
  } catch (e) {
    // Reducers are stubs for now; swallow errors in early phases
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
