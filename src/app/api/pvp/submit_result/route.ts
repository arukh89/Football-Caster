import { NextResponse, type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { stPvpSubmitResult } from '@/lib/spacetime/api'

export const runtime = 'nodejs'

async function handler(req: NextRequest, ctx: { fid: number }): Promise<Response> {
  try {
    const body = (await req.json()) as { matchId?: string; result?: any }
    const matchId = String(body?.matchId || '')
    const result = body?.result ?? {}
    if (!matchId) return NextResponse.json({ error: 'invalid_match' }, { status: 400 })
    await stPvpSubmitResult(matchId, ctx.fid, result)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('pvp/submit_result error', e)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}

export const POST = requireAuth(handler)
