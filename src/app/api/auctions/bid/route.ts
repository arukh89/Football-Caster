/**
 * POST /api/auctions/bid
 * Place bid on auction
 */

import { type NextRequest, NextResponse } from 'next/server';
import { stGetAuction, stPlaceBid } from '@/lib/spacetime/api';
import { validate, placeBidSchema } from '@/lib/middleware/validation';
import { requireAuth } from '@/lib/middleware/auth';

export const runtime = 'nodejs';

async function handler(req: NextRequest, ctx: { fid: number }): Promise<Response> {
  try {
    const body = await req.json();
    const validation = validate(placeBidSchema, body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { auctionId, amountFbcWei } = validation.data;
    const { fid } = ctx;

    // Get auction
    const auction = await stGetAuction(auctionId);
    if (!auction || auction.status !== 'active') {
      return NextResponse.json({ error: 'Auction not found or closed' }, { status: 404 });
    }

    // Can't bid on own auction
    if (auction.sellerFid === fid) {
      return NextResponse.json({ error: 'Cannot bid on own auction' }, { status: 400 });
    }

    const bidAmount = BigInt(amountFbcWei);

    // Reserve, min increment, and timing are enforced atomically in the reducer

    // Buy-now threshold reached -> require dedicated buy-now flow with on-chain verification
    if (auction.buyNowFbcWei && bidAmount >= BigInt(auction.buyNowFbcWei)) {
      return NextResponse.json(
        { error: 'Bid meets buy-now price. Use /api/auctions/buy-now with txHash to complete.' , buyNowFbcWei: auction.buyNowFbcWei },
        { status: 409 }
      );
    }

    // Place bid via reducer (handles increments + anti-snipe)
    const status = await stPlaceBid(auctionId, fid, amountFbcWei);
    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error('Place bid error:', error);
    return NextResponse.json(
      { error: 'Failed to place bid' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(handler);
