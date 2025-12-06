import { NextRequest } from 'next/server'

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '600',
}

export function OPTIONS(_req: NextRequest) {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}
