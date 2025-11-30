import { NextResponse, type NextRequest } from 'next/server'
import { getSpacetime } from '@/lib/spacetime/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest): Promise<Response> {
  try {
    const url = new URL(req.url)
    // Optional time window filters
    const fromMs = url.searchParams.get('fromMs') ? Number(url.searchParams.get('fromMs')) : null
    const toMs = url.searchParams.get('toMs') ? Number(url.searchParams.get('toMs')) : null

    const st = await getSpacetime()
    let where = `status = 'finalized' AND result_json IS NOT NULL`
    if (fromMs) where += ` AND accepted_at_ms >= ${fromMs}`
    if (toMs) where += ` AND accepted_at_ms <= ${toMs}`

    const rows = (await st.query(
      `SELECT id, challenger_fid, challenged_fid, result_json FROM pvp_match WHERE ${where}`
    )) as Array<{ id: string; challenger_fid: number; challenged_fid: number; result_json: string }>

    type Row = { fid: number; points: number; w: number; d: number; l: number }
    const table = new Map<number, Row>()
    const incr = (fid: number, delta: Partial<Row>) => {
      const cur = table.get(fid) || { fid, points: 0, w: 0, d: 0, l: 0 }
      table.set(fid, {
        fid,
        points: cur.points + (delta.points ?? 0),
        w: cur.w + (delta.w ?? 0),
        d: cur.d + (delta.d ?? 0),
        l: cur.l + (delta.l ?? 0),
      })
    }

    for (const r of rows) {
      try {
        const j = JSON.parse(r.result_json || '{}') as { home?: number; away?: number }
        const home = Number(j.home ?? NaN)
        const away = Number(j.away ?? NaN)
        if (!Number.isFinite(home) || !Number.isFinite(away)) continue
        if (home > away) {
          incr(r.challenger_fid, { points: 3, w: 1 })
          incr(r.challenged_fid, { l: 1 })
        } else if (home < away) {
          incr(r.challenged_fid, { points: 3, w: 1 })
          incr(r.challenger_fid, { l: 1 })
        } else {
          incr(r.challenger_fid, { points: 1, d: 1 })
          incr(r.challenged_fid, { points: 1, d: 1 })
        }
      } catch {}
    }

    const leaderboard = Array.from(table.values()).sort((a, b) => (
      b.points - a.points || b.w - a.w || a.l - b.l
    ))

    return NextResponse.json({ leaderboard }, { headers: { 'Cache-Control': 'private, no-store, no-cache, must-revalidate' } })
  } catch (e) {
    console.error('season/leaderboard error', e)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
