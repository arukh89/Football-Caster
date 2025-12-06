import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { getSpacetime, getEnv } = await import('@/lib/spacetime/client')
    const st: any = await getSpacetime()

    const env = getEnv()

    const userNpcCount = Array.from(st.db.user.iter()).filter((u: any) => u.isNpc === true).length
    const npcRegistryCount = Array.from(st.db.npcRegistry.iter()).length
    const assignmentCount = Array.from(st.db.npcAssignment.iter()).length
    const inventoryNpcItems = Array.from(st.db.inventoryItem.iter()).filter((x: any) => x.itemType === 'npc_manager').length

    return NextResponse.json({
      ok: true,
      env,
      counts: { userNpcCount, npcRegistryCount, assignmentCount, inventoryNpcItems },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 })
  }
}
