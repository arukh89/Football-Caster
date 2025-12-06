import { type NextRequest, NextResponse } from 'next/server';
import type { z } from 'zod';
import { validate } from '@/lib/middleware/validation';

export function ok<T>(data: T, init?: ResponseInit): Response {
  return NextResponse.json(data as any, init);
}

export function jsonError(message: string, status: number): Response {
  return NextResponse.json({ error: message }, { status });
}

export const badRequest = (msg = 'Bad Request'): Response => jsonError(msg, 400);
export const unauthorized = (msg = 'Unauthorized'): Response => jsonError(msg, 401);
export const forbidden = (msg = 'Forbidden'): Response => jsonError(msg, 403);
export const notFound = (msg = 'Not Found'): Response => jsonError(msg, 404);
export const conflict = (msg = 'Conflict'): Response => jsonError(msg, 409);
export const serverError = (msg = 'Internal Server Error'): Response => jsonError(msg, 500);

export const cache = {
  privateNoStore: { 'Cache-Control': 'private, no-store, no-cache, must-revalidate' } as Record<string, string>,
};

export async function validateBody<T>(
  req: NextRequest,
  schema: z.Schema<T>
): Promise<{ ok: true; data: T } | { ok: false; res: Response }> {
  try {
    const body = await req.json();
    const v = validate(schema, body);
    if (!('success' in v) || !v.success) {
      return { ok: false, res: badRequest((v as any).error ?? 'Validation failed') };
    }
    return { ok: true, data: v.data };
  } catch (_e) {
    return { ok: false, res: badRequest('Invalid JSON body') };
  }
}

export async function withErrorHandling(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    console.error('API handler error:', error);
    return serverError('An unexpected error occurred');
  }
}
