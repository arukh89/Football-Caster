import { NextResponse, type NextRequest } from 'next/server'
import { requireAuth, type AuthContext } from '@/lib/middleware/auth'
import { stNpcCreate } from '@/lib/spacetime/api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type SeedBody = {
  count?: number
  startFid?: number
  difficultyTier?: number
  budgetFbcWei?: string
}

function rand(min: number, max: number) { return Math.floor(min + Math.random() * (max - min + 1)) }

function isAdminFID(fid: number): boolean {
  const list = (process.env.ADMIN_FIDS || '')
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n))
  return list.includes(fid)
}

async function handler(req: NextRequest, ctx: AuthContext): Promise<Response> {
  if (!isAdminFID(ctx.fid)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    const body = (await req.json().catch(() => ({}))) as SeedBody
    const count = Math.max(1, Math.min(500, Number(body.count ?? 50)))
    const startFid = Number.isFinite(Number(body.startFid)) ? Number(body.startFid) : 900_000_000
    const difficultyTier = Math.max(1, Math.min(5, Number(body.difficultyTier ?? 3)))
    const budgetFbcWei = String(body.budgetFbcWei ?? '1000000000000000000') // 1 FBC default

    const results: { fid: number; ok: boolean; error?: string }[] = []
    for (let i = 0; i < count; i++) {
      const npcFid = startFid + i
      const displayName = `NPC Manager #${npcFid}`
      const aiSeed = rand(1, 10_000)
      const personaJson = JSON.stringify({ persona: 'balanced', seed: aiSeed })
      try {
        await stNpcCreate(npcFid, displayName, aiSeed, difficultyTier, budgetFbcWei, personaJson)
        results.push({ fid: npcFid, ok: true })
      } catch (e) {
        results.push({ fid: npcFid, ok: false, error: String(e) })
      }
    }

    const okCount = results.filter(r => r.ok).length
    return NextResponse.json({ ok: true, createdOrUpdated: okCount, attempted: count, startFid, difficultyTier })
  } catch (e) {
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}

export const POST = requireAuth(handler)
