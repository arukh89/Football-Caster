/**
 * POST /api/market/buy
 * Buy a marketplace listing
 */

import { type NextRequest } from 'next/server';
import type { Address, Hash } from 'viem';
import { stGetListing, stGetUser, stCloseListingAndTransfer, stIsTxUsed, stMarkTxUsed, stMarketplacePurchaseApply } from '@/lib/spacetime/api';
import { verifyFBCTransferExact } from '@/lib/services/verification';
import { validate, buyListingSchema } from '@/lib/middleware/validation';
import { requireAuth } from '@/lib/middleware/auth';
import { withErrorHandling, validateBody, badRequest, notFound, conflict, ok } from '@/lib/api/http';

export const runtime = 'nodejs';

async function handler(req: NextRequest, ctx: { fid: number; wallet: string }): Promise<Response> {
  return withErrorHandling(async () => {
    const parsed = await validateBody(req, buyListingSchema);
    if (!parsed.ok) return parsed.res;

    const { listingId, txHash } = parsed.data;
    const { fid, wallet } = ctx;

    const txUsed = await stIsTxUsed(txHash);
    if (txUsed) return conflict('Transaction hash already used');

    const listing = await stGetListing(listingId);
    if (!listing || listing.status !== 'active') return notFound('Listing not found or closed');
    if (listing.sellerFid === fid) return badRequest('Cannot buy own listing');

    const seller = await stGetUser(listing.sellerFid);
    if (!seller) return notFound('Seller not found');
    if (!seller.wallet) return badRequest('Seller has no linked wallet');

    const verification = await verifyFBCTransferExact(
      txHash as Hash,
      wallet as Address,
      seller.wallet as Address,
      listing.priceFbcWei
    );
    if (!verification.valid) return badRequest(verification.error || 'Payment verification failed');

    const useAtomic = process.env.ENABLE_ATOMIC_PURCHASE === 'true';
    if (useAtomic) {
      await stMarketplacePurchaseApply(txHash, fid, listingId);
    } else {
      await stMarkTxUsed(txHash, fid, '/api/market/buy');
      await stCloseListingAndTransfer(listingId, fid);
    }

    return ok({ success: true, itemId: listing.itemId });
  });
}

export const POST = requireAuth(handler);
