/**
 * GET /api/zeroex/price
 * Server-side proxy to 0x v2 Allowance-Holder Price endpoint
 * Docs: https://api.0x.org/swap/allowance-holder/price
 */

import type { NextRequest } from 'next/server';
import { ok, withErrorHandling, jsonError } from '@/lib/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function HEAD(): Promise<Response> {
  return new Response(null, { status: 204 });
}

export async function GET(req: NextRequest): Promise<Response> {
  return withErrorHandling(async () => {
    const src = req.nextUrl.searchParams;

    const buyToken = src.get('buyToken');
    const sellToken = src.get('sellToken');
    const sellAmount = src.get('sellAmount');
    const buyAmount = src.get('buyAmount');

    if (!buyToken || !sellToken) {
      return jsonError('Missing buyToken or sellToken parameter', 400);
    }
    if (!sellAmount && !buyAmount) {
      return jsonError('Missing sellAmount or buyAmount parameter', 400);
    }

    const upstream = new URL('https://api.0x.org/swap/allowance-holder/price');
    const sp = new URLSearchParams();

    // Required
    sp.set('buyToken', buyToken);
    sp.set('sellToken', sellToken);
    if (sellAmount) sp.set('sellAmount', sellAmount);
    if (buyAmount) sp.set('buyAmount', buyAmount);

    // ChainId default to Base
    const chainId = src.get('chainId') || '8453';
    sp.set('chainId', chainId);

    // Taker mapping (accept taker or takerAddress)
    const taker = src.get('taker') || src.get('takerAddress');
    if (taker) sp.set('taker', taker);

    // Slippage mapping (accept slippageBps or slippagePercentage)
    const slippageBps = src.get('slippageBps');
    const slippagePct = src.get('slippagePercentage');
    if (slippageBps) sp.set('slippageBps', slippageBps);
    else if (slippagePct) {
      const n = Number.parseFloat(slippagePct);
      if (Number.isFinite(n)) sp.set('slippageBps', String(Math.round(n * 100)));
    }

    // Pass through any extra params that 0x may support in the future
    for (const [k, v] of src.entries()) {
      if (!sp.has(k) && !['takerAddress', 'slippagePercentage'].includes(k)) {
        sp.set(k, v);
      }
    }

    try {
      const apiKey = process.env.ZERO_EX_API_KEY || process.env.ZEROEX_API_KEY || '';
      const res = await fetch(`${upstream.toString()}?${sp.toString()}`, {
        headers: {
          accept: 'application/json',
          '0x-api-key': apiKey,
          '0x-version': 'v2',
          'user-agent': 'FootballCaster/1.0 (+server-proxy)'
        },
        cache: 'no-store',
      });
      const text = await res.text();

      if (res.status === 404) return jsonError('Token pair not found or liquidity unavailable', 404);
      if (res.status === 429) return jsonError('Rate limited by 0x API. Please try again later.', 429);

      try {
        const json = JSON.parse(text);
        if (json.code && json.reason) return jsonError(json.reason || 'Price failed', 400);
        return ok(json, { status: res.status });
      } catch {
        return new Response(text, {
          status: res.status,
          headers: { 'content-type': res.headers.get('content-type') || 'text/plain' },
        });
      }
    } catch (error) {
      console.error('0x price proxy error:', error);
      return jsonError('Failed to fetch price from 0x API', 500);
    }
  });
}
