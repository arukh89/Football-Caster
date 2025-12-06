/**
 * POST /api/auctions/buy-now
 * Buy-now flow with on-chain payment verification
 */

import { type NextRequest } from 'next/server';
import type { Address, Hash } from 'viem';
import { stGetAuction, stGetUser, stBuyNow, stIsTxUsed, stMarkTxUsed, stAuctionBuyNowApply } from '@/lib/spacetime/api';
import { verifyFBCTransferExact } from '@/lib/services/verification';
import { validate, buyNowAuctionSchema } from '@/lib/middleware/validation';
import { requireAuth } from '@/lib/middleware/auth';
import { withErrorHandling, validateBody, badRequest, notFound, conflict, ok } from '@/lib/api/http';

export const runtime = 'nodejs';

async function handler(req: NextRequest, ctx: { fid: number; wallet: string }): Promise<Response> {
  return withErrorHandling(async () => {
    const parsed = await validateBody(req, buyNowAuctionSchema);
    if (!parsed.ok) return parsed.res;

    const { auctionId, txHash } = parsed.data;
    const { fid, wallet } = ctx;

    const txUsed = await stIsTxUsed(txHash);
    if (txUsed) return conflict('Transaction hash already used');

    const auction = await stGetAuction(auctionId);
    if (!auction || auction.status !== 'active') return notFound('Auction not found or not active');
    if (!auction.buyNowFbcWei) return badRequest('Buy-now not available');
    if (auction.sellerFid === fid) return badRequest('Cannot buy own auction');

    const seller = await stGetUser(auction.sellerFid);
    if (!seller) return notFound('Seller not found');
    if (!seller.wallet) return badRequest('Seller has no linked wallet');

    const verification = await verifyFBCTransferExact(
      txHash as Hash,
      wallet as Address,
      seller.wallet as Address,
      auction.buyNowFbcWei
    );
    if (!verification.valid) return badRequest(verification.error || 'Payment verification failed');

    const useAtomic = process.env.ENABLE_ATOMIC_PURCHASE === 'true';
    if (useAtomic) {
      await stAuctionBuyNowApply(txHash, fid, auctionId, auction.buyNowFbcWei);
    } else {
      await stMarkTxUsed(txHash, fid, '/api/auctions/buy-now');
      await stBuyNow(auctionId, fid, auction.buyNowFbcWei);
    }

    return ok({ success: true, status: 'buy_now', auctionId });
  });
}

export const POST = requireAuth(handler);
