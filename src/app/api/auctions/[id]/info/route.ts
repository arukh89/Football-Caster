/**
 * GET /api/auctions/[id]/info
 * Returns buy-now payment target for client wallet flow
 */

import { type NextRequest } from 'next/server';
import { stGetAuction, stGetUser } from '@/lib/spacetime/api';
import { withErrorHandling, notFound, badRequest, ok } from '@/lib/api/http';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  return withErrorHandling(async () => {
    const { id: auctionId } = await ctx.params;
    const auction = await stGetAuction(auctionId);
    if (!auction) return notFound('Auction not found');
    if (!auction.buyNowFbcWei) return badRequest('Buy-now not available');

    const seller = await stGetUser(auction.sellerFid);
    const sellerWallet: string | null = seller?.wallet ?? null;
    if (!sellerWallet) return badRequest('Seller has no linked wallet');

    return ok({ auctionId, sellerWallet, buyNowFbcWei: auction.buyNowFbcWei });
  });
}
