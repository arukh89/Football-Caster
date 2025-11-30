/**
 * POST /api/auctions/bid
 * Place bid on auction
 */

import { type NextRequest, NextResponse } from 'next/server';
import { stGetAuction, stPlaceBid } from '@/lib/spacetime/api';
import { validate, placeBidSchema } from '@/lib/middleware/validation';
import { requireAuth } from '@/lib/middleware/auth';
// import { randomUUID } from 'crypto';

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

    // Check if ended
    if (new Date(auction.endsAt).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Auction has ended' }, { status: 400 });
    }

    // Can't bid on own auction
    if (auction.sellerFid === fid) {
      return NextResponse.json({ error: 'Cannot bid on own auction' }, { status: 400 });
    }

    const bidAmount = BigInt(amountFbcWei);

    // Check reserve met
    if (bidAmount < BigInt(auction.reserveFbcWei)) {
      return NextResponse.json(
        { error: `Bid must meet reserve of ${auction.reserveFbcWei}` },
        { status: 400 }
      );
    }

    // Check minimum increment (+2% or 1 FBC)
    if (auction.topBidFbcWei) {
      const currentBid = BigInt(auction.topBidFbcWei);
      const minIncrement = currentBid / BigInt(50); // 2%
      const minIncrementFloor = BigInt(1e18); // 1 FBC

      const requiredBid = currentBid + (minIncrement > minIncrementFloor ? minIncrement : minIncrementFloor);

      if (bidAmount < requiredBid) {
        return NextResponse.json(
          { error: `Bid must be at least ${requiredBid.toString()} (2% increment or +1 FBC)` },
          { status: 400 }
        );
      }
    }

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
