/**
 * GET /api/inbox - Get inbox messages
 * POST /api/inbox - Mark messages as read
 */

import { type NextRequest, NextResponse } from 'next/server';
import { stGetInbox, stInboxMarkRead } from '@/lib/spacetime/api';
import { requireAuth } from '@/lib/middleware/auth';
import { validate, markReadSchema } from '@/lib/middleware/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getHandler(req: NextRequest, ctx: { fid: number }): Promise<Response> {
  try {
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unread') === 'true';

    const all = await stGetInbox(ctx.fid);
    const messages = unreadOnly ? all.filter((m: any) => !m.readAtMs) : all;

    return NextResponse.json(
      { messages },
      { headers: { 'Cache-Control': 'private, no-store, no-cache, must-revalidate' } }
    );
  } catch (error) {
    console.error('Get inbox error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inbox' },
      { status: 500 }
    );
  }
}

async function postHandler(req: NextRequest, ctx: { fid: number }): Promise<Response> {
  try {
    const body = await req.json();
    const validation = validate(markReadSchema, body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { ids } = validation.data;
    await stInboxMarkRead(ctx.fid, ids);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    return NextResponse.json(
      { error: 'Failed to mark messages as read' },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler);
export const POST = requireAuth(postHandler);
