// Deprecated endpoint: moved to /api/pricing/quote
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(): Promise<Response> {
  const starterPriceUSD = process.env.NEXT_PUBLIC_STARTER_PACK_PRICE_USD || '1';
  return fetch(new URL('/api/pricing/quote', process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usd: starterPriceUSD }),
    cache: 'no-store',
  });
}
