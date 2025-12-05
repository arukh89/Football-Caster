/**
 * POST /api/starter/verify
 * Verify starter pack payment and grant pack
 */

import { type NextRequest, NextResponse } from 'next/server';
import type { Address, Hash } from 'viem';
import { stHasClaimedStarter, stGrantStarterPack, stIsTxUsed, stMarkTxUsed, stNpcAssignForUser } from '@/lib/spacetime/api';
import { verifyFBCTransfer } from '@/lib/services/verification';
import { validate, verifyStarterSchema } from '@/lib/middleware/validation';
import { requireAuth, isDevFID } from '@/lib/middleware/auth';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TREASURY_ADDRESS = (process.env.NEXT_PUBLIC_TREASURY_ADDRESS as Address) || '0x0000000000000000000000000000000000000000';
const STARTER_PRICE_USD = process.env.NEXT_PUBLIC_STARTER_PACK_PRICE_USD || '1';

// Generate starter pack (18 random players)
function generateStarterPack(): Array<{ itemId: string; itemType: string; rating: number }> {
  const players: Array<{ itemId: string; itemType: string; rating: number }> = [];

  for (let i = 0; i < 18; i++) {
    players.push({
      itemId: `player-${randomUUID()}`,
      itemType: 'player',
      rating: Math.floor(Math.random() * 30) + 60, // 60-90 rating
    });
  }

  return players;
}

async function handler(req: NextRequest, ctx: { fid: number; wallet: string }): Promise<Response> {
  try {
    const rawBody = await req.json().catch(() => ({}));
    const { fid, wallet } = ctx;
    const already = await stHasClaimedStarter(fid);
    if (already) return NextResponse.json({ error: 'Starter already claimed' }, { status: 409 });

    // Admin/Dev bypass (no payment required):
    // - Dev FID
    // - Admin wallet (treasury address)
    const isAdminWallet = (wallet || '').toLowerCase() === TREASURY_ADDRESS.toLowerCase();
    if (isDevFID(fid) || isAdminWallet) {
      const pack = generateStarterPack();
      await stGrantStarterPack(fid, pack.map((p) => ({
        player_id: p.itemId,
        name: null,
        position: null,
        rating: p.rating,
      })));
      // Assign 18 tradable NPC managers to the user
      await stNpcAssignForUser(fid, 18);
      return NextResponse.json({ success: true, pack, bypass: true });
    }

    // For non-bypass path, validate request body
    const validation = validate(verifyStarterSchema, rawBody);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { txHash } = validation.data;

    // Check for transaction replay attack
    const txUsed = await stIsTxUsed(txHash);
    if (txUsed) {
      return NextResponse.json({ error: 'Transaction hash already used' }, { status: 409 });
    }

    // Verify payment
    const verification = await verifyFBCTransfer(
      txHash as Hash,
      wallet as Address,
      TREASURY_ADDRESS,
      STARTER_PRICE_USD,
      true // allow any sender address (payer can be different from linked wallet)
    );

    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error || 'Payment verification failed' },
        { status: 400 }
      );
    }

    // Mark transaction as used to prevent replay
    await stMarkTxUsed(txHash, fid, '/api/starter/verify');

    // Generate and grant pack via Spacetime
    const pack = generateStarterPack();
    await stGrantStarterPack(fid, pack.map((p) => ({
      player_id: p.itemId,
      name: null,
      position: null,
      rating: p.rating,
    })));
    // Assign 18 tradable NPC managers to the user
    await stNpcAssignForUser(fid, 18);

    return NextResponse.json({ success: true, pack });
  } catch (error) {
    console.error('Starter verify error:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(handler);
