import { ok, jsonError } from '@/lib/api/http';
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
    return ok({ now });
  } catch (e) {
    // Standardized error response
    return jsonError((e as Error)?.message || 'Internal error', 500);
  }
}
