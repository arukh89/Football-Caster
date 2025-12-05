import { NextResponse, type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { stOfficialCreate } from '@/lib/spacetime/api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function rand(min: number, max: number) { return Math.floor(min + Math.random() * (max - min + 1)) }

async function tryCreate(role: string) {
  const aiSeed = rand(1, 10_000)
  const strictness = rand(40, 90)
  const advantageTendency = rand(30, 80)
  const offsideTolerance = rand(40, 85)
  const varPropensity = rand(20, 70)
  const consistency = rand(50, 95)
  const fitness = rand(60, 95)
  const reputation = rand(40, 90)
  try {
    await stOfficialCreate(role, aiSeed, strictness, advantageTendency, offsideTolerance, varPropensity, consistency, fitness, reputation)
    return { ok: true }
  } catch (e) {
    // Reducer may be unimplemented; ignore
    return { ok: false, error: String(e) }
  }
}

async function handler(req: NextRequest): Promise<Response> {
  try {
    const countParam = Number((await req.json().catch(() => ({})))?.count ?? 4)
    const wantsVar = countParam >= 4
    const results: any[] = []
    // Always attempt at least a full crew
    results.push(await tryCreate('referee'))
    results.push(await tryCreate('assistant_left'))
    results.push(await tryCreate('assistant_right'))
    if (wantsVar) results.push(await tryCreate('var'))
    return NextResponse.json({ ok: true, attempted: results.length })
  } catch (e) {
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}

export const POST = requireAuth(handler)
