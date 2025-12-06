/**
 * POST /api/market/buy
 * Buy a marketplace listing
 */

import { type NextRequest, NextResponse } from 'next/server';
import type { Address, Hash } from 'viem';
import { stGetListing, stGetUser, stCloseListingAndTransfer, stIsTxUsed, stMarkTxUsed, stMarketplacePurchaseApply } from '@/lib/spacetime/api';
import { verifyFBCTransferExact } from '@/lib/services/verification';
import { validate, buyListingSchema } from '@/lib/middleware/validation';
import { requireAuth } from '@/lib/middleware/auth';

export const runtime = 'nodejs';

async function handler(req: NextRequest, ctx: { fid: number; wallet: string }): Promise<Response> {
  try {
    const body = await req.json();
    const validation = validate(buyListingSchema, body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { listingId, txHash } = validation.data;
    const { fid, wallet } = ctx;

    // Check for transaction replay attack
    const txUsed = await stIsTxUsed(txHash);
    if (txUsed) {
      return NextResponse.json({ error: 'Transaction hash already used' }, { status: 409 });
    }

    // Get listing
    const listing = await stGetListing(listingId);
    if (!listing || listing.status !== 'active') {
      return NextResponse.json({ error: 'Listing not found or closed' }, { status: 404 });
    }

    // Can't buy own listing
    if (listing.sellerFid === fid) {
      return NextResponse.json({ error: 'Cannot buy own listing' }, { status: 400 });
    }

    // Get seller wallet
    const seller = await stGetUser(listing.sellerFid);
    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }
    if (!seller.wallet) {
      return NextResponse.json({ error: 'Seller has no linked wallet' }, { status: 400 });
    }

    // Verify FBC transfer
    const verification = await verifyFBCTransferExact(
      txHash as Hash,
      wallet as Address,
      seller.wallet as Address,
      listing.priceFbcWei
    );

    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error || 'Payment verification failed' },
        { status: 400 }
      );
    }

    const useAtomic = process.env.ENABLE_ATOMIC_PURCHASE === 'true';
    if (useAtomic) {
      // Single atomic reducer ensures idempotency
      await stMarketplacePurchaseApply(txHash, fid, listingId);
    } else {
      // Legacy 2-step flow
      await stMarkTxUsed(txHash, fid, '/api/market/buy');
      await stCloseListingAndTransfer(listingId, fid);
    }

    return NextResponse.json({ success: true, itemId: listing.itemId });
  } catch (error) {
    console.error('Buy listing error:', error);
    return NextResponse.json(
      { error: 'Failed to process purchase' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(handler);
