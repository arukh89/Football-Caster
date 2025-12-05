import { NextResponse, type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { stVarReviewRecord } from '@/lib/spacetime/api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function handler(req: NextRequest): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({})) as any
    const matchId = typeof body?.matchId === 'string' ? body.matchId : null
    const tsMs = Number(body?.tsMs || Date.now())
    const decision = String(body?.decision || '')
    const reason = String(body?.reason || '')
    const metaJson = JSON.stringify(body?.meta ?? {})

    if (!matchId || !decision) {
      return NextResponse.json({ error: 'missing_params' }, { status: 400 })
    }

    try {
      await stVarReviewRecord(matchId, tsMs, decision, reason, metaJson)
    } catch (e) {
      console.warn('var_review_record failed (non-fatal):', e)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('match/var-log error', e)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}

export const POST = requireAuth(handler)
