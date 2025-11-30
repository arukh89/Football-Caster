/**
 * GET /api/pricing/fbc-usd
 * Get current FBC/USD price
 */

import { NextResponse } from 'next/server';
import { getFBCPrice } from '@/lib/services/pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(): Promise<Response> {
  try {
    const priceData = await getFBCPrice();

    return NextResponse.json(
      {
        priceUsd: priceData.priceUsd,
        source: priceData.source,
        timestamp: priceData.timestamp,
      },
      { headers: { 'Cache-Control': 'private, no-store, no-cache, must-revalidate' } }
    );
  } catch (error) {
    console.error('Price fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch price' },
      { status: 500 }
    );
  }
}
