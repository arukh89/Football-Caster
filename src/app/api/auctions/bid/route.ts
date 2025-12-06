/**
 * POST /api/auctions/bid
 * Place bid on auction
 */

import { type NextRequest } from 'next/server';
import { stGetAuction, stPlaceBid } from '@/lib/spacetime/api';
import { validate, placeBidSchema } from '@/lib/middleware/validation';
import { requireAuth } from '@/lib/middleware/auth';
import { withErrorHandling, validateBody, badRequest, notFound, ok, conflict } from '@/lib/api/http';

export const runtime = 'nodejs';

async function handler(req: NextRequest, ctx: { fid: number }): Promise<Response> {
  return withErrorHandling(async () => {
    const parsed = await validateBody(req, placeBidSchema);
    if (!parsed.ok) return parsed.res;

    const { auctionId, amountFbcWei } = parsed.data;
    const { fid } = ctx;

    const auction = await stGetAuction(auctionId);
    if (!auction || auction.status !== 'active') {
      return notFound('Auction not found or closed');
    }

    if (auction.sellerFid === fid) {
      return badRequest('Cannot bid on own auction');
    }

    const bidAmount = BigInt(amountFbcWei);

    if (auction.buyNowFbcWei && bidAmount >= BigInt(auction.buyNowFbcWei)) {
      return conflict('Bid meets buy-now price. Use /api/auctions/buy-now with txHash to complete.');
    }

    const status = await stPlaceBid(auctionId, fid, amountFbcWei);
    return ok({ success: true, status });
  });
}

export const POST = requireAuth(handler);
