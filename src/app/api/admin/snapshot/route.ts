/**
 * POST /api/admin/snapshot
 * Generate weekly snapshot (for cron)
 */

import { NextResponse } from 'next/server';
// Snapshot disabled in SpacetimeDB architecture; Vercel serverless cannot write to FS

export const runtime = 'nodejs';

export async function POST(): Promise<Response> {
  try {
    return NextResponse.json({ success: true, message: 'Snapshot disabled under SpacetimeDB' });
  } catch (error) {
    console.error('Snapshot error:', error);
    return NextResponse.json(
      { error: 'Failed to generate snapshot' },
      { status: 500 }
    );
  }
}
