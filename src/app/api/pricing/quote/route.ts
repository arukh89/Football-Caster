/**
 * POST /api/pricing/quote
 * Get FBC amount quote for USD value
 */

import { type NextRequest, NextResponse } from 'next/server';
import { getQuote } from '@/lib/services/pricing';
import { validate, quoteSchema } from '@/lib/middleware/validation';

export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const body = await req.json();
    const validation = validate(quoteSchema, body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { usd } = validation.data;
    const quote = await getQuote(usd);

    return NextResponse.json(quote);
  } catch (error) {
    console.error('Quote error:', error);
    return NextResponse.json(
      { error: 'Failed to generate quote' },
      { status: 500 }
    );
  }
}
