/**
 * GET /api/auctions/[id]/info
 * Returns buy-now payment target for client wallet flow
 */

import { NextResponse } from 'next/server';
import { stGetAuction, stGetUser } from '@/lib/spacetime/api';

export const runtime = 'nodejs';

interface Params {
  params: { id: string };
}

export async function GET(_req: Request, { params }: Params): Promise<Response> {
  try {
    const auctionId = params.id;
    const auction = await stGetAuction(auctionId);
    if (!auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
    }

    if (!auction.buyNowWei) {
      return NextResponse.json({ error: 'Buy-now not available' }, { status: 400 });
    }

    const seller = await stGetUser(auction.sellerFid);
    const sellerWallet: string | null = seller?.wallet ?? null;

    if (!sellerWallet) {
      return NextResponse.json({ error: 'Seller has no linked wallet' }, { status: 400 });
    }

    return NextResponse.json({
      auctionId,
      sellerWallet,
      buyNowWei: auction.buyNowWei,
    });
  } catch (error) {
    console.error('Auction info error:', error);
    return NextResponse.json({ error: 'Failed to fetch auction info' }, { status: 500 });
  }
}
