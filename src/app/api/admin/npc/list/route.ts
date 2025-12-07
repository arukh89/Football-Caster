import type { NextRequest } from 'next/server'
import { requireAuth, type AuthContext, isAdminFID, isDevFID } from '@/lib/middleware/auth'
import { withErrorHandling, ok, forbidden, cache, badRequest } from '@/lib/api/http'
import { CONTRACT_ADDRESSES } from '@/lib/constants'
import { stListNPCs, type NpcSortKey } from '@/lib/spacetime/api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function isAdmin(ctx: AuthContext): boolean {
  if (!ctx) return false
  if (isDevFID(ctx.fid)) return true
  if (isAdminFID(ctx.fid)) return true
  if ((ctx.wallet || '').toLowerCase() === CONTRACT_ADDRESSES.treasury.toLowerCase()) return true
  return false
}

function parseBool(v: string | null): boolean | undefined {
  if (v == null) return undefined
  const s = v.trim().toLowerCase()
  if (s === '1' || s === 'true' || s === 'yes') return true
  if (s === '0' || s === 'false' || s === 'no') return false
  return undefined
}

async function handler(req: NextRequest, ctx: AuthContext): Promise<Response> {
  return withErrorHandling(async () => {
    if (!isAdmin(ctx)) return forbidden('Forbidden')

    const url = new URL(req.url)
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
    const pageSize = Math.max(1, Math.min(200, parseInt(url.searchParams.get('pageSize') || url.searchParams.get('perPage') || '25', 10)))
    const active = parseBool(url.searchParams.get('active'))
    const owned = parseBool(url.searchParams.get('owned'))
    const ownedBy = owned ? ctx.fid : undefined
    const search = (url.searchParams.get('search') || '').slice(0, 64)
    const sortParam = (url.searchParams.get('sort') || 'lastActive').toLowerCase()
    const orderParam = (url.searchParams.get('order') || 'desc').toLowerCase()

    const sortKeys: Record<string, NpcSortKey> = {
      lastactive: 'lastActive',
      fid: 'fid',
      difficulty: 'difficulty',
      confidence: 'confidence',
    }
    const sort = sortKeys[sortParam] ?? 'lastActive'
    const order = orderParam === 'asc' ? 'asc' : 'desc'

    const data = await stListNPCs({ page, pageSize, active, ownedBy, search, sort, order })
    return ok(data, { headers: cache.privateNoStore })
  })
}

export const GET = requireAuth(handler)
