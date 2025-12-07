import { NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/http';
import { stListNPCs, type NpcSortKey } from '@/lib/spacetime/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  return withErrorHandling(async () => {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '25', 10);
    const activeParam = searchParams.get('active');
    const active = activeParam == null ? undefined : ['1', 'true', 'yes'].includes(activeParam.toLowerCase());
    const ownedByParam = searchParams.get('ownedBy');
    const ownedBy = ownedByParam ? parseInt(ownedByParam, 10) : undefined;
    const search = searchParams.get('search') || '';
    const sort = (searchParams.get('sort') as NpcSortKey) || 'lastActive';
    const order = (searchParams.get('order') as 'asc' | 'desc') || 'desc';

    const result = await stListNPCs({ page, pageSize, active, ownedBy, search, sort, order });
    return NextResponse.json(result);
  });
}
