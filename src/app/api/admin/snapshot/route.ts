/**
 * POST /api/admin/snapshot
 * Generate weekly snapshot (for cron)
 */

import { NextResponse } from 'next/server';
import { requireAuth, isDevFID } from '@/lib/middleware/auth';
// Snapshot disabled in SpacetimeDB architecture; Vercel serverless cannot write to FS

export const runtime = 'nodejs';

async function handler(_: Request, ctx: { fid: number }): Promise<Response> {
  try {
    // Guard: Only allow when explicitly enabled and caller is dev/admin
    const enabled = process.env.ENABLE_ADMIN_ENDPOINTS === 'true';
    if (!enabled || !isDevFID(ctx.fid)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ success: true, message: 'Snapshot disabled under SpacetimeDB' });
  } catch (error) {
    console.error('Snapshot error:', error);
    return NextResponse.json(
      { error: 'Failed to generate snapshot' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(handler);
