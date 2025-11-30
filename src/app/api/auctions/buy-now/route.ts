/**
 * POST /api/auctions/buy-now
 * Buy-now flow with on-chain payment verification
 */

import { type NextRequest, NextResponse } from 'next/server';
import type { Address, Hash } from 'viem';
import { stGetAuction, stGetUser, stBuyNow } from '@/lib/spacetime/api';
import { verifyFBCTransferExact } from '@/lib/services/verification';
import { validate, buyNowAuctionSchema } from '@/lib/middleware/validation';
import { requireAuth } from '@/lib/middleware/auth';

export const runtime = 'nodejs';

async function handler(req: NextRequest, ctx: { fid: number; wallet: string }): Promise<Response> {
  try {
    const body = await req.json();
    const validation = validate(buyNowAuctionSchema, body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { auctionId, txHash } = validation.data;
    const { fid, wallet } = ctx;

    // Get auction
    const auction = await stGetAuction(auctionId);
    if (!auction || auction.status !== 'active') {
      return NextResponse.json({ error: 'Auction not found or not active' }, { status: 404 });
    }

    if (!auction.buyNowFbcWei) {
      return NextResponse.json({ error: 'Buy-now not available' }, { status: 400 });
    }

    // Can't buy own auction
    if (auction.sellerFid === fid) {
      return NextResponse.json({ error: 'Cannot buy own auction' }, { status: 400 });
    }

    // Get seller wallet
    const seller = await stGetUser(auction.sellerFid);
    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }
    if (!seller.wallet) {
      return NextResponse.json({ error: 'Seller has no linked wallet' }, { status: 400 });
    }

    // Verify buy-now payment
    const verification = await verifyFBCTransferExact(
      txHash as Hash,
      wallet as Address,
      seller.wallet as Address,
      auction.buyNowFbcWei
    );

    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error || 'Payment verification failed' },
        { status: 400 }
      );
    }

    // Perform buy-now via reducer (handles finalize + transfer)
    await stBuyNow(auctionId, fid, auction.buyNowFbcWei);

    return NextResponse.json({ success: true, status: 'buy_now', auctionId });
  } catch (error) {
    console.error('Buy-now error:', error);
    return NextResponse.json(
      { error: 'Failed to process buy-now' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(handler);
