/**
 * DEPRECATED: This endpoint was a placeholder and is no longer used.
 * Entry flow uses /api/starter/verify instead.
 * 
 * Returns 501 Not Implemented to indicate this is intentionally disabled.
 */

import { NextResponse } from 'next/server';

export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use /api/starter/verify for entry flow.' },
    { status: 501 }
  );
}
