/**
 * GET /api/zeroex/quote
 * Server-side proxy to 0x Base API (bypasses browser CSP)
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
    // Check if essential query params exist
    const sp = req.nextUrl.searchParams;
    const buyToken = sp.get('buyToken');
    const sellToken = sp.get('sellToken');
    
    if (!buyToken || !sellToken) {
      return jsonError('Missing buyToken or sellToken parameter', 400);
    }

    // Build upstream URL
    const upstream = new URL('https://base.api.0x.org/swap/v1/quote');
    
    // Forward all query params
    for (const [k, v] of sp.entries()) {
      upstream.searchParams.append(k, v);
    }

    try {
      const res = await fetch(upstream.toString(), {
        headers: {
          accept: 'application/json',
          '0x-api-key': process.env.ZEROEX_API_KEY || '', // Optional API key if you have one
          'user-agent': 'FootballCaster/1.0 (+server-proxy)'
        },
        cache: 'no-store',
      });

      const bodyText = await res.text();
      
      // Handle 404 - token not found
      if (res.status === 404) {
        return jsonError('Token pair not found or liquidity unavailable', 404);
      }

      // Handle rate limiting
      if (res.status === 429) {
        return jsonError('Rate limited by 0x API. Please try again later.', 429);
      }
      
      // Parse and return response
      try {
        const json = JSON.parse(bodyText);
        
        // Check for API errors in response body
        if (json.code && json.reason) {
          return jsonError(json.reason || 'Quote failed', 400);
        }
        
        return ok(json, { status: res.status });
      } catch {
        // If not JSON, return raw response
        return new Response(bodyText, {
          status: res.status,
          headers: { 'content-type': res.headers.get('content-type') || 'text/plain' },
        });
      }
    } catch (error) {
      console.error('0x proxy error:', error);
      return jsonError('Failed to fetch quote from 0x API', 500);
    }
  });
}
