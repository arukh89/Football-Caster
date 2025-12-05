/**
 * POST /api/admin/starter/grant
 * Admin-only: grant starter pack to a target FID (optionally link wallet first)
 */

import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth, isDevFID } from '@/lib/middleware/auth';
import { adminGrantStarterSchema, validate } from '@/lib/middleware/validation';
import { stHasClaimedStarter, stGrantStarterPack, stLinkWallet } from '@/lib/spacetime/api';
import { reducers as stReducers, getEnv, getSpacetime } from '@/lib/spacetime/client';
import type { Address } from 'viem';
import { randomUUID } from 'crypto';
import { CONTRACT_ADDRESSES } from '@/lib/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function generateStarterPack(): Array<{ player_id: string; name: string | null; position: string | null; rating: number }> {
  const players: Array<{ player_id: string; name: string | null; position: string | null; rating: number }> = [];
  for (let i = 0; i < 18; i++) {
    players.push({
      player_id: `player-${randomUUID()}`,
      name: null,
      position: null,
      rating: Math.floor(Math.random() * 30) + 60,
    });
  }
  return players;
}

async function handler(req: NextRequest, ctx: { fid: number; wallet: string }): Promise<Response> {
  try {
    // Preflight: ensure reducer exists on the connected module
    try {
      const r: any = await stReducers();
      const st = await getSpacetime();
      const { URI, DB_NAME } = getEnv();
      const reducerKeys = r ? Object.getOwnPropertyNames(r).filter((k) => typeof (r as any)[k] !== 'undefined') : [];
      const tableKeys = st?.db ? Object.getOwnPropertyNames(st.db).filter((k) => !k.startsWith('_')) : [];
      const ok = !!(r && (typeof r.grant_starter_pack === 'function' || typeof r.get === 'function' || typeof r.call === 'function'));
      if (!ok) {
        return NextResponse.json(
          {
            error: 'Reducer grant_starter_pack not available on SpacetimeDB module.',
            hint: 'Check DB name/URI and deployed schema.',
            env: { uri: URI, dbName: DB_NAME },
            availableReducers: reducerKeys,
            availableTables: tableKeys,
          },
          { status: 500 }
        );
      }
    } catch (e) {
      return NextResponse.json(
        { error: 'Failed to connect to SpacetimeDB', detail: (e as Error)?.message || String(e) },
        { status: 500 }
      );
    }
    // Authorization: only admin wallet or dev FID
    const isAdminWallet = (ctx.wallet || '').toLowerCase() === (CONTRACT_ADDRESSES.treasury as Address).toLowerCase();
    if (!isAdminWallet && !isDevFID(ctx.fid)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const validation = validate(adminGrantStarterSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { fid, wallet } = validation.data;

    // Optional: link wallet if provided
    if (wallet) {
      await stLinkWallet(fid, wallet.toLowerCase());
    }

    // Prevent double grant
    const already = await stHasClaimedStarter(fid);
    if (already) return NextResponse.json({ error: 'Starter already claimed' }, { status: 409 });

    const players = generateStarterPack();
    try {
      await stGrantStarterPack(fid, players);
    } catch (e) {
      const msg = (e as Error)?.message || String(e);
      // Normalize common reducer panics
      if (msg.includes('starter_already_claimed')) {
        return NextResponse.json({ error: 'Starter already claimed' }, { status: 409 });
      }
      return NextResponse.json(
        { error: 'Grant reducer failed', detail: msg },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, fid, linkedWallet: wallet || null, playersGranted: players.length });
  } catch (error) {
    console.error('Admin grant starter error:', error);
    const msg = (error as Error)?.message || String(error);
    return NextResponse.json({ error: 'Failed to grant starter pack', detail: msg }, { status: 500 });
  }
}

export const POST = requireAuth(handler);
