/**
 * GET /api/auctions - Get active auctions
 * POST /api/auctions - Create new auction
 */

import { type NextRequest } from 'next/server';
import { stListActiveAuctions, stCreateAuction } from '@/lib/spacetime/api';
import { validate, createAuctionSchema } from '@/lib/middleware/validation';
import { requireAuth } from '@/lib/middleware/auth';
import { ok, cache, withErrorHandling, validateBody, badRequest } from '@/lib/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(): Promise<Response> {
  return withErrorHandling(async () => {
    const auctions = await stListActiveAuctions();
    return ok({ auctions }, { headers: cache.privateNoStore });
  });
}

async function postHandler(req: NextRequest, ctx: { fid: number }): Promise<Response> {
  return withErrorHandling(async () => {
    const parsed = await validateBody(req, createAuctionSchema);
    if (!parsed.ok) return parsed.res;

    const { itemId, reserveFbcWei, durationH, buyNowFbcWei } = parsed.data;
    const { fid } = ctx;

    const duration = durationH ?? 48;
    const auction = await stCreateAuction(
      fid,
      itemId,
      reserveFbcWei,
      duration * 60 * 60,
      buyNowFbcWei ?? null
    );

    return ok({ success: true, auction });
  });
}

export const POST = requireAuth(postHandler);
