/**
 * POST /api/admin/starter/grant
 * Admin-only: grant starter pack to a target FID (optionally link wallet first)
 */

import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth, isDevFID } from '@/lib/middleware/auth';
import { adminGrantStarterSchema, validate } from '@/lib/middleware/validation';
import { stHasClaimedStarter, stGrantStarterPack, stLinkWallet } from '@/lib/spacetime/api';
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
    await stGrantStarterPack(fid, players);

    return NextResponse.json({ success: true, fid, linkedWallet: wallet || null, playersGranted: players.length });
  } catch (error) {
    console.error('Admin grant starter error:', error);
    return NextResponse.json({ error: 'Failed to grant starter pack' }, { status: 500 });
  }
}

export const POST = requireAuth(handler);
