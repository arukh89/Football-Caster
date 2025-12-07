import { ok, jsonError } from '@/lib/api/http'

// Minimal scheduled job handler. Configure FARCASTER_API_KEY in hosting env.
export const runtime = 'nodejs'

export async function GET(): Promise<Response> {
  try {
    const key = process.env.FARCASTER_API_KEY
    if (!key) {
      console.warn('FARCASTER_API_KEY not set; skipping ingest')
      return ok({ skipped: true })
    }

    // TODO: Implement real ingest from Neynar/Hubs
    // Placeholder: no-op
    console.log('Farcaster ingest tick: weekly job executed')
    return ok({})
  } catch (e) {
    console.error('cron/farcaster-ingest error', e)
    return jsonError('ingest_failed', 500)
  }
}
