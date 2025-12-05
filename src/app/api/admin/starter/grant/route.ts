/**
 * POST /api/admin/starter/grant
 * Admin-only: grant starter pack to a target FID (optionally link wallet first)
 */

import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth, isAdminFID } from '@/lib/middleware/auth';
import { stHasClaimedStarter, stGrantStarterPack, stLinkWallet, stNpcAssignForUser } from '@/lib/spacetime/api';
import { reducers as stReducers, getEnv, getSpacetime } from '@/lib/spacetime/client';
import { adminGrantStarterSchema, validate } from '@/lib/middleware/validation';
import type { Address } from 'viem';
import { recoverMessageAddress, isAddressEqual } from 'viem';
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
      const ok = !!(
        r && (
          typeof (r as any).grant_starter_pack === 'function' ||
          typeof (r as any).grantStarterPack === 'function' ||
          typeof (r as any).get === 'function' ||
          typeof (r as any).call === 'function'
        )
      );
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
    // Parse input
    const body = await req.json().catch(() => ({}));
    const validation = validate(adminGrantStarterSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { fid, wallet, signature, message } = validation.data as { fid: number; wallet?: string; signature?: `0x${string}`; message?: string };

    // Authorization: require admin signature unless dev FID
    const isAdmin = isAdminFID(ctx.fid);
    if (!isAdmin) {
      if (!signature || !message) {
        return NextResponse.json({ error: 'Missing admin signature' }, { status: 400 });
      }
      try {
        const recovered = await recoverMessageAddress({ message, signature });
        const ok = isAddressEqual(recovered as Address, CONTRACT_ADDRESSES.treasury as Address);
        if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      } catch (e) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    }

    // Optional: link target wallet if provided
    if (wallet) {
      await stLinkWallet(fid, wallet.toLowerCase());
    }

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

    // Admin-only: assign 18 tradable NPC managers to the user
    try {
      await stNpcAssignForUser(fid, 18);
    } catch (e) {
      const msg = (e as Error)?.message || String(e);
      if (msg.includes('insufficient_npc_pool')) {
        return NextResponse.json({ error: 'insufficient_npc_pool', detail: 'Not enough NPCs available to assign 18' }, { status: 409 });
      }
      // soft-fail other errors
      console.warn('NPC assign failed:', msg);
    }

    return NextResponse.json({ success: true, fid, linkedWallet: wallet || null, playersGranted: players.length, npcsAssigned: 18 });
  } catch (error) {
    console.error('Admin grant starter error:', error);
    const msg = (error as Error)?.message || String(error);
    return NextResponse.json({ error: 'Failed to grant starter pack', detail: msg }, { status: 500 });
  }
}

export const POST = requireAuth(handler);
