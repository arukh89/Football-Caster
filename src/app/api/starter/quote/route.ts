/**
 * POST /api/starter/quote
 * Get quote for starter pack ($1 in FBC)
 */

import { NextResponse } from 'next/server';
import { getQuote } from '@/lib/services/pricing';

export const runtime = 'nodejs';

export async function POST(): Promise<Response> {
  try {
    const starterPriceUSD = process.env.NEXT_PUBLIC_STARTER_PACK_PRICE_USD || '1';
    const quote = await getQuote(starterPriceUSD);

    return NextResponse.json({
      amountWei: quote.amountWei,
      priceUsd: quote.priceUsd,
      usdAmount: starterPriceUSD,
    });
  } catch (error) {
    console.error('Starter quote error:', error);
    return NextResponse.json(
      { error: 'Failed to generate quote' },
      { status: 500 }
    );
  }
}
