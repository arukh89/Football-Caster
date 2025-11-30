import { NextResponse, type NextRequest } from 'next/server'

export const runtime = 'edge'

export async function OPTIONS(req: NextRequest): Promise<Response> {
  const origin = req.headers.get('origin')
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Requested-With',
    'Access-Control-Max-Age': '600',
    'Vary': 'Origin',
  }
  if (origin && (origin === 'https://warpcast.com' || origin === 'https://www.warpcast.com' || origin === 'https://client.warpcast.com')) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  return new NextResponse(null, { status: 204, headers })
}

export async function POST(req: NextRequest): Promise<Response> {
  // Explicitly no-op to avoid third-party analytics CORS issues
  const origin = req.headers.get('origin')
  const res = new NextResponse(null, { status: 204 })
  if (origin && (origin === 'https://warpcast.com' || origin === 'https://www.warpcast.com' || origin === 'https://client.warpcast.com')) {
    res.headers.set('Access-Control-Allow-Origin', origin)
  }
  res.headers.set('Vary', 'Origin')
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Requested-With')
  res.headers.set('Access-Control-Max-Age', '600')
  return res
}
