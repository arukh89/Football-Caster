/**
 * GET /api/market/listings - Get active listings
 * POST /api/market/listings - Create new listing
 */

import { type NextRequest } from 'next/server';
import { stListActiveListings, stCreateListing, stSquadMintFromFarcaster } from '@/lib/spacetime/api';
import { validate, createListingSchema } from '@/lib/middleware/validation';
import { requireAuth, isDevFID } from '@/lib/middleware/auth';
import { ok, cache, withErrorHandling, validateBody } from '@/lib/api/http';
import { fetchTopFarcasterUsers, rankFromFollowers, intelligenceFromFollowers } from '@/lib/services/neynar';
import { DEV_FID } from '@/lib/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function ensureNeynarBootstrap(): Promise<void> {
  try {
    // Only run when we have zero squad listings (auto-refill when stock is empty)
    const existing = await stListActiveListings();
    const anySquad = existing.some((l: any) => l.itemType === 'squad');
    if (anySquad) return;

    // Seed 250 initial squads from Neynar
    const users = await fetchTopFarcasterUsers(250);
    if (!users.length) return;

    // Mint squads and list them at a nominal fixed price (e.g., 5 FBC)
    const priceWei = '5000000000000000000'; // 5 FBC
    for (const u of users) {
      const rank = rankFromFollowers(u.followers);
      const intel = intelligenceFromFollowers(u.followers);
      const persona = JSON.stringify({ username: u.username, display_name: u.display_name, bio: u.bio, followers: u.followers });
      // Mint to DEV_FID so we can list them centrally
      await stSquadMintFromFarcaster(u.fid, u.followers || 0, DEV_FID, intel, rank, persona);
      const itemId = `squad-${u.fid}`;
      try { await stCreateListing(DEV_FID, itemId, priceWei); } catch {}
    }
  } catch (e) {
    console.warn('Neynar bootstrap skipped:', e);
  }
}

export async function GET(): Promise<Response> {
  return withErrorHandling(async () => {
    await ensureNeynarBootstrap();
    const listings = await stListActiveListings();
    return ok({ listings }, { headers: cache.privateNoStore });
  });
}

async function postHandler(req: NextRequest, ctx: { fid: number; wallet: string }): Promise<Response> {
  try {
    const parsed = await validateBody(req, createListingSchema);
    if (!parsed.ok) return parsed.res;

    const { itemId, priceFbcWei } = parsed.data;
    const { fid } = ctx;
    // Server-side reducer enforces ownership and hold rules
    const listing = await stCreateListing(fid, itemId, priceFbcWei);

    return ok({ success: true, listing });
  } catch (error) {
    console.error('Create listing error:', error);
    throw error;
  }
}

export const POST = requireAuth(postHandler);
