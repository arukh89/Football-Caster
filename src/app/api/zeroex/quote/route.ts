/**
 * GET /api/zeroex/quote
 * Server-side proxy to 0x Base API (bypasses browser CSP)
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function HEAD(): Promise<Response> {
  return new NextResponse(null, { status: 204 });
}

export async function GET(req: NextRequest): Promise<Response> {
  try {
    const upstream = new URL('https://base.api.0x.org/swap/v1/quote');
    const sp = req.nextUrl.searchParams;
    // Forward all query params
    for (const [k, v] of sp.entries()) upstream.searchParams.append(k, v);

    const res = await fetch(upstream.toString(), {
      headers: {
        accept: 'application/json',
        'user-agent': 'FootballCaster/1.0 (+server-proxy)'
      },
      cache: 'no-store',
    });

    const bodyText = await res.text();
    try {
      const json = JSON.parse(bodyText);
      return NextResponse.json(json, { status: res.status });
    } catch {
      return new NextResponse(bodyText, {
        status: res.status,
        headers: { 'content-type': res.headers.get('content-type') || 'text/plain' },
      });
    }
  } catch (err) {
    console.error('0x proxy error:', err);
    return NextResponse.json({ error: 'Proxy fetch failed' }, { status: 502 });
  }
}
