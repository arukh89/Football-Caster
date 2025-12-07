/**
 * POST /api/starter/verify
 * Verify starter pack payment and grant pack
 */

import { type NextRequest } from 'next/server';
import type { Address, Hash } from 'viem';
import { stHasClaimedStarter, stGrantStarterPack, stIsTxUsed, stMarkTxUsed, stSquadMintFromFarcaster } from '@/lib/spacetime/api';
import { fetchFarcasterUser, rankFromFollowers, intelligenceFromFollowers } from '@/lib/services/neynar';
import { verifyFBCTransfer } from '@/lib/services/verification';
import { validate, verifyStarterSchema } from '@/lib/middleware/validation';
import { requireAuth, isDevFID } from '@/lib/middleware/auth';
import { generateStarterPack, toUiPack } from '@/lib/starter/generate';
import { withErrorHandling, validateBody, ok, conflict, badRequest } from '@/lib/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TREASURY_ADDRESS = (process.env.NEXT_PUBLIC_TREASURY_ADDRESS as Address) || '0x0000000000000000000000000000000000000000';
const STARTER_PRICE_USD = process.env.NEXT_PUBLIC_STARTER_PACK_PRICE_USD || '1';

// generateStarterPack moved to shared util

async function handler(req: NextRequest, ctx: { fid: number; wallet: string }): Promise<Response> {
  return withErrorHandling(async () => {
    const { fid, wallet } = ctx;
    const already = await stHasClaimedStarter(fid);
    if (already) return conflict('Starter already claimed');

    // Admin/Dev bypass (no payment required):
    // - Dev FID
    // - Admin wallet (treasury address)
    const isAdminWallet = (wallet || '').toLowerCase() === TREASURY_ADDRESS.toLowerCase();
    if (isDevFID(fid) || isAdminWallet) {
      const players = generateStarterPack();
      await stGrantStarterPack(fid, players);
      // Auto-mint NPC Squad for the user (from Neynar)
      try {
        const u = await fetchFarcasterUser(fid);
        const followers = u?.followers || 0;
        const rank = rankFromFollowers(followers);
        const intel = intelligenceFromFollowers(followers);
        const persona = JSON.stringify({ username: u?.username, display_name: u?.display_name, bio: u?.bio, followers });
        await stSquadMintFromFarcaster(fid, followers, fid, intel, rank, persona);
      } catch {}
      return ok({ success: true, pack: toUiPack(players), bypass: true, npcSquadMinted: true });
    }

    // For non-bypass path, validate request body
    const parsed = await validateBody(req, verifyStarterSchema);
    if (!parsed.ok) return parsed.res;
    const { txHash } = parsed.data;

    // Check for transaction replay attack
    const txUsed = await stIsTxUsed(txHash);
    if (txUsed) return conflict('Transaction hash already used');

    // Verify payment
    const verification = await verifyFBCTransfer(
      txHash as Hash,
      wallet as Address,
      TREASURY_ADDRESS,
      STARTER_PRICE_USD,
      true // allow any sender address (payer can be different from linked wallet)
    );

    if (!verification.valid) return badRequest(verification.error || 'Payment verification failed');

    // Mark transaction as used to prevent replay
    await stMarkTxUsed(txHash, fid, '/api/starter/verify');

    // Generate and grant pack via Spacetime
    const players = generateStarterPack();
    await stGrantStarterPack(fid, players);

    // Auto-mint NPC Squad for the user (from Neynar)
    try {
      const u = await fetchFarcasterUser(fid);
      const followers = u?.followers || 0;
      const rank = rankFromFollowers(followers);
      const intel = intelligenceFromFollowers(followers);
      const persona = JSON.stringify({ username: u?.username, display_name: u?.display_name, bio: u?.bio, followers });
      await stSquadMintFromFarcaster(fid, followers, fid, intel, rank, persona);
    } catch {}

    return ok({ success: true, pack: toUiPack(players), npcSquadMinted: true });
  });
}

export const POST = requireAuth(handler);
