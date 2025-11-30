import { NextResponse } from 'next/server'

// Minimal scheduled job handler. Configure FARCASTER_API_KEY in hosting env.
export const runtime = 'nodejs'

export async function GET(): Promise<Response> {
  try {
    const key = process.env.FARCASTER_API_KEY
    if (!key) {
      console.warn('FARCASTER_API_KEY not set; skipping ingest')
      return NextResponse.json({ ok: true, skipped: true })
    }

    // TODO: Implement real ingest from Neynar/Hubs
    // Placeholder: no-op
    console.log('Farcaster ingest tick: weekly job executed')
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('cron/farcaster-ingest error', e)
    return NextResponse.json({ error: 'ingest_failed' }, { status: 500 })
  }
}
