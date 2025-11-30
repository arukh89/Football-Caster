import { NextResponse, type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { stPvpChallenge } from '@/lib/spacetime/api'
import { getSpacetime } from '@/lib/spacetime/client'

export const runtime = 'nodejs'

async function handler(req: NextRequest, ctx: { fid: number }): Promise<Response> {
  try {
    const body = (await req.json()) as { challengedFid?: number }
    const challengedFid = Number(body?.challengedFid)
    if (!challengedFid || challengedFid <= 0) return NextResponse.json({ error: 'invalid_fid' }, { status: 400 })

    // simple rate limit: max 5 challenges per 60s per fid
    const st = await getSpacetime()
    const since = Date.now() - 60_000
    const rows = (await st.query(`SELECT COUNT(*) as c FROM event WHERE actor_fid = ${ctx.fid} AND kind = 'pvp_match_created' AND ts_ms >= ${since}`)) as Array<{ c: number }>
    const count = Number(rows?.[0]?.c || 0)
    if (count > 5) return NextResponse.json({ error: 'rate_limited' }, { status: 429 })

    const { id } = await stPvpChallenge(ctx.fid, challengedFid)
    return NextResponse.json({ id })
  } catch (e) {
    console.error('pvp/challenge error', e)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}

export const POST = requireAuth(handler)
