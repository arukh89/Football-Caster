/**
 * POST /api/admin/starter/grant
 * Disabled endpoint (legacy). Always returns 404.
 */

import { type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { withErrorHandling, notFound } from '@/lib/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handler(_req: NextRequest): Promise<Response> {
  return withErrorHandling(async () => notFound('Endpoint removed'));
}

export const POST = requireAuth(handler);
