/**
 * GET /api/market/listings - Get active listings
 * POST /api/market/listings - Create new listing
 */

import { type NextRequest } from 'next/server';
import { stListActiveListings, stCreateListing } from '@/lib/spacetime/api';
import { validate, createListingSchema } from '@/lib/middleware/validation';
import { requireAuth, isDevFID } from '@/lib/middleware/auth';
import { ok, cache, withErrorHandling, validateBody } from '@/lib/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(): Promise<Response> {
  return withErrorHandling(async () => {
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
