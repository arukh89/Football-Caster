/**
 * POST /api/auctions/finalize
 * Finalize auction after winner payment
 */

import { type NextRequest } from 'next/server';
import type { Address, Hash } from 'viem';
import { stGetAuction, stGetUser, stFinalizeAuction, stIsTxUsed, stMarkTxUsed } from '@/lib/spacetime/api';
import { verifyFBCTransferExact } from '@/lib/services/verification';
import { validate, finalizeAuctionSchema } from '@/lib/middleware/validation';
import { requireAuth } from '@/lib/middleware/auth';
import { withErrorHandling, validateBody, badRequest, notFound, conflict, ok, forbidden } from '@/lib/api/http';

export const runtime = 'nodejs';

async function handler(req: NextRequest, ctx: { fid: number; wallet: string }): Promise<Response> {
  return withErrorHandling(async () => {
    const parsed = await validateBody(req, finalizeAuctionSchema);
    if (!parsed.ok) return parsed.res;

    const { auctionId, txHash } = parsed.data;
    const { fid, wallet } = ctx;

    const txUsed = await stIsTxUsed(txHash);
    if (txUsed) return conflict('Transaction hash already used');

    const auction = await stGetAuction(auctionId);
    if (!auction) return notFound('Auction not found');
    if (auction.status !== 'awaiting_payment') return badRequest('Auction not awaiting payment');
    if (auction.topBidderFid !== fid) return forbidden('Only winner can finalize');
    if (!auction.topBidFbcWei) return badRequest('No winning bid');

    const seller = await stGetUser(auction.sellerFid);
    if (!seller) return notFound('Seller not found');
    if (!seller.wallet) return badRequest('Seller has no linked wallet');

    const verification = await verifyFBCTransferExact(
      txHash as Hash,
      wallet as Address,
      seller.wallet as Address,
      auction.topBidFbcWei
    );
    if (!verification.valid) return badRequest(verification.error || 'Payment verification failed');

    await stMarkTxUsed(txHash, fid, '/api/auctions/finalize');
    await stFinalizeAuction(auctionId, fid);

    return ok({ success: true, itemId: auction.itemId });
  });
}

export const POST = requireAuth(handler);
