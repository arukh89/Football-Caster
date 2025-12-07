import { withErrorHandling, ok, cache } from '@/lib/api/http';
import { reducers as stReducers, getEnv, getSpacetime } from '@/lib/spacetime/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  return withErrorHandling(async () => {
    const { URI, DB_NAME } = getEnv();
    const summary: any = {
      uri: URI,
      dbName: DB_NAME,
      connected: false,
      tables: [],
      reducers: [],
      sampleCounts: {},
    };

    const st = await getSpacetime();
    const r: any = await stReducers();
    summary.connected = !!st && !!st.db;
    try {
      summary.tables = Object.getOwnPropertyNames(st.db).filter((k) => !k.startsWith('_'));
    } catch {}
    try {
      summary.reducers = Object.getOwnPropertyNames(r).filter((k) => typeof r[k] === 'function');
    } catch {}

    // Sample a few table counts to prove read access
    const sample: Record<string, number> = {};
    const tableKeys = ['inventoryItem', 'listing', 'npcRegistry', 'squadRegistry', 'starterClaim', 'user'];
    for (const key of tableKeys) {
      try {
        const it = (st.db as any)[key]?.iter?.();
        if (it && typeof it[Symbol.iterator] === 'function') {
          let n = 0;
          for (const _ of it as Iterable<any>) { n++; if (n >= 5) break; }
          sample[key] = n; // up to 5 for speed
        }
      } catch {}
    }
    summary.sampleCounts = sample;

    return ok(summary, { headers: cache.privateNoStore });
  });
}
