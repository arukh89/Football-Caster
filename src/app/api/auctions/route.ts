/**
 * GET /api/auctions - Get active auctions
 * POST /api/auctions - Create new auction
 */

import { type NextRequest, NextResponse } from 'next/server';
import { stListActiveAuctions, stCreateAuction } from '@/lib/spacetime/api';
import { validate, createAuctionSchema } from '@/lib/middleware/validation';
import { requireAuth } from '@/lib/middleware/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(): Promise<Response> {
  try {
    const auctions = await stListActiveAuctions();

    return NextResponse.json(
      { auctions },
      { headers: { 'Cache-Control': 'private, no-store, no-cache, must-revalidate' } }
    );
  } catch (error) {
    console.error('Get auctions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch auctions' },
      { status: 500 }
    );
  }
}

async function postHandler(req: NextRequest, ctx: { fid: number }): Promise<Response> {
  try {
    const body = await req.json();
    const validation = validate(createAuctionSchema, body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { itemId, reserveFbcWei, durationH, buyNowFbcWei } = validation.data;
    const { fid } = ctx;

    const duration = durationH ?? 48;
    const auction = await stCreateAuction(fid, itemId, reserveFbcWei, duration * 60 * 60, buyNowFbcWei ?? null);

    return NextResponse.json({
      success: true,
      auction,
    });
  } catch (error) {
    console.error('Create auction error:', error);
    return NextResponse.json(
      { error: 'Failed to create auction' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(postHandler);
