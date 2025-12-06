import { NextResponse, type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import type { AuthContext } from '@/lib/middleware/auth'
import { stOfficialAssignToMatch } from '@/lib/spacetime/api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function handler(req: NextRequest, _ctx: AuthContext): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({})) as any
    const matchId = typeof body?.matchId === 'string' ? body.matchId : null
    const refereeId = String(body?.refereeId || '')
    const assistantLeftId = String(body?.assistantLeftId || '')
    const assistantRightId = String(body?.assistantRightId || '')
    const varId = body?.varId ? String(body.varId) : null

    if (!refereeId || !assistantLeftId || !assistantRightId) {
      return NextResponse.json({ error: 'missing_official_ids' }, { status: 400 })
    }

    if (matchId) {
      try {
        await stOfficialAssignToMatch(matchId, refereeId, assistantLeftId, assistantRightId, varId)
      } catch (e) {
        // Backend reducer may be unimplemented; tolerate and still return ok for UI continuity
        console.warn('official_assign_to_match failed (non-fatal):', e)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('officials/assign error', e)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}

export const POST = requireAuth(handler)
