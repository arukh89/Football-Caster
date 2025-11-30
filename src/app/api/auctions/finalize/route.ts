/**
 * POST /api/auctions/finalize
 * Finalize auction after winner payment
 */

import { type NextRequest, NextResponse } from 'next/server';
import type { Address, Hash } from 'viem';
import { stGetAuction, stGetUser, stFinalizeAuction } from '@/lib/spacetime/api';
import { verifyFBCTransferExact } from '@/lib/services/verification';
import { validate, finalizeAuctionSchema } from '@/lib/middleware/validation';
import { requireAuth } from '@/lib/middleware/auth';

export const runtime = 'nodejs';

async function handler(req: NextRequest, ctx: { fid: number; wallet: string }): Promise<Response> {
  try {
    const body = await req.json();
    const validation = validate(finalizeAuctionSchema, body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { auctionId, txHash } = validation.data;
    const { fid, wallet } = ctx;

    // Get auction
    const auction = await stGetAuction(auctionId);
    if (!auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
    }

    // Must be awaiting payment (auction ended but not finalized)
    if (auction.status !== 'awaiting_payment') {
      return NextResponse.json({ error: 'Auction not awaiting payment' }, { status: 400 });
    }

    // Must be winner
    if (auction.topBidderFid !== fid) {
      return NextResponse.json({ error: 'Only winner can finalize' }, { status: 403 });
    }

    if (!auction.topBidFbcWei) {
      return NextResponse.json({ error: 'No winning bid' }, { status: 400 });
    }

    // Get seller wallet
    const seller = await stGetUser(auction.sellerFid);
    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }
    if (!seller.wallet) {
      return NextResponse.json({ error: 'Seller has no linked wallet' }, { status: 400 });
    }

    // Verify payment
    const verification = await verifyFBCTransferExact(
      txHash as Hash,
      wallet as Address,
      seller.wallet as Address,
      auction.topBidFbcWei
    );

    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error || 'Payment verification failed' },
        { status: 400 }
      );
    }

    // Finalize auction via reducer (handles event + transfer + inbox internally)
    await stFinalizeAuction(auctionId, fid);

    return NextResponse.json({ success: true, itemId: auction.itemId });
  } catch (error) {
    console.error('Finalize auction error:', error);
    return NextResponse.json(
      { error: 'Failed to finalize auction' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(handler);
