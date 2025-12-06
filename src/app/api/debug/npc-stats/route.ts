import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { getSpacetime, getEnv, reducers } = await import('@/lib/spacetime/client')
    const st: any = await getSpacetime()
    const r: any = await reducers()

    const env = getEnv()

    const userNpcCount = Array.from(st.db.user.iter()).filter((u: any) => u.isNpc === true).length
    const npcRegistryCount = Array.from(st.db.npcRegistry.iter()).length
    const assignmentCount = Array.from(st.db.npcAssignment.iter()).length
    const inventoryNpcItems = Array.from(st.db.inventoryItem.iter()).filter((x: any) => x.itemType === 'npc_manager').length

    const reducerKeys = Object.getOwnPropertyNames(r).filter((k) => typeof (r as any)[k] === 'function')
    return NextResponse.json({
      ok: true,
      env,
      counts: { userNpcCount, npcRegistryCount, assignmentCount, inventoryNpcItems },
      reducerKeys,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 })
  }
}
