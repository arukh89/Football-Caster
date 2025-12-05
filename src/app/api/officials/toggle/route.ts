import { NextResponse, type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { stOfficialSetActive } from '@/lib/spacetime/api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function handler(req: NextRequest): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({})) as any
    const officialId = String(body?.officialId || '')
    const active = Boolean(body?.active)
    if (!officialId) return NextResponse.json({ error: 'missing_id' }, { status: 400 })
    try {
      await stOfficialSetActive(officialId, active)
    } catch (e) {
      console.warn('official_set_active failed (non-fatal):', e)
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('officials/toggle error', e)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}

export const POST = requireAuth(handler)
