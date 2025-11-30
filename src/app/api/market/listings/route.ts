/**
 * GET /api/market/listings - Get active listings
 * POST /api/market/listings - Create new listing
 */

import { type NextRequest, NextResponse } from 'next/server';
import { stListActiveListings, stCreateListing } from '@/lib/spacetime/api';
import { validate, createListingSchema } from '@/lib/middleware/validation';
import { requireAuth, isDevFID } from '@/lib/middleware/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(): Promise<Response> {
  try {
    const listings = await stListActiveListings();

    return NextResponse.json(
      { listings },
      { headers: { 'Cache-Control': 'private, no-store, no-cache, must-revalidate' } }
    );
  } catch (error) {
    console.error('Get listings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch listings' },
      { status: 500 }
    );
  }
}

async function postHandler(req: NextRequest, ctx: { fid: number; wallet: string }): Promise<Response> {
  try {
    const body = await req.json();
    const validation = validate(createListingSchema, body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { itemId, priceFbcWei } = validation.data;
    const { fid } = ctx;
    // Server-side reducer enforces ownership and hold rules
    const listing = await stCreateListing(fid, itemId, priceFbcWei);

    return NextResponse.json({
      success: true,
      listing,
    });
  } catch (error) {
    console.error('Create listing error:', error);
    return NextResponse.json(
      { error: 'Failed to create listing' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(postHandler);
