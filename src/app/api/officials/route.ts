import { NextResponse, type NextRequest } from 'next/server'
import { getSpacetime } from '@/lib/spacetime/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type OfficialRole = 'referee' | 'assistant_left' | 'assistant_right' | 'var'

function synth(id: string, role: OfficialRole, seed: number) {
  // Deterministic-ish attributes from seed
  const rand = (min: number, max: number) => Math.floor(min + ((seed % 97) / 97) * (max - min))
  return {
    officialId: id,
    role,
    strictness: rand(40, 90),
    advantageTendency: rand(30, 80),
    offsideTolerance: rand(40, 85),
    varPropensity: rand(20, 70),
    consistency: rand(50, 95),
    fitness: rand(60, 95),
    reputation: rand(40, 90),
    aiSeed: seed,
    active: true,
    lastAssignedMs: 0,
    synthetic: true,
  }
}

function fallbackOfficials() {
  return [
    synth('ref-synth-1', 'referee', 101),
    synth('al-synth-1', 'assistant_left', 202),
    synth('ar-synth-1', 'assistant_right', 303),
    synth('var-synth-1', 'var', 404),
  ]
}

export async function GET(_req: NextRequest): Promise<Response> {
  try {
    const st = await getSpacetime()
    const out: any[] = []
    // Prefer generated bindings shape, but tolerate raw SDK structures
    try {
      for (const row of st.db.officials.iter() as Iterable<any>) {
        out.push({
          officialId: row.officialId ?? row.official_id,
          role: row.role,
          strictness: Number(row.strictness),
          advantageTendency: Number(row.advantageTendency ?? row.advantage_tendency),
          offsideTolerance: Number(row.offsideTolerance ?? row.offside_tolerance),
          varPropensity: Number(row.varPropensity ?? row.var_propensity),
          consistency: Number(row.consistency),
          fitness: Number(row.fitness),
          reputation: Number(row.reputation),
          aiSeed: Number(row.aiSeed ?? row.ai_seed ?? 0),
          active: !!row.active,
          lastAssignedMs: Number(row.lastAssignedMs ?? row.last_assigned_ms ?? 0),
        })
      }
    } catch {}

    if (out.length === 0) {
      return NextResponse.json({ officials: fallbackOfficials(), synthetic: true }, { headers: { 'Cache-Control': 'no-store' } })
    }
    // Sort: referee first, then assistants, then var
    const order = { referee: 0, assistant_left: 1, assistant_right: 2, var: 3 } as Record<string, number>
    out.sort((a, b) => (order[a.role] ?? 9) - (order[b.role] ?? 9))
    return NextResponse.json({ officials: out, synthetic: false }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    // Fallback to synthetic on error as well
    return NextResponse.json({ officials: fallbackOfficials(), synthetic: true }, { headers: { 'Cache-Control': 'no-store' } })
  }
}
