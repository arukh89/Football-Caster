import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const ALLOWED_ORIGINS = new Set([
  'https://warpcast.com',
  'https://www.warpcast.com',
  'https://client.warpcast.com',
])

function corsHeaders(origin: string | null): HeadersInit {
  const h: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Requested-With',
    'Vary': 'Origin',
  }
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    h['Access-Control-Allow-Origin'] = origin
    // h['Access-Control-Allow-Credentials'] = 'true' // enable if using cookies
  }
  return h
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  // Only apply to API routes
  if (!pathname.startsWith('/api')) return NextResponse.next()

  const origin = req.headers.get('origin')
  const headers = corsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers })
  }

  const res = NextResponse.next()
  Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v))
  return res
}

export const config = {
  matcher: ['/api/:path*'],
}
