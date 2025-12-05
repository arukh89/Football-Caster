import { NextResponse } from 'next/server';
import { stSquadMintFromFarcaster } from '@/lib/spacetime/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function intelligenceFromFollowers(followers: number): number {
  const score = Math.ceil(20 + 15 * Math.log10(followers + 1));
  return Math.max(70, Math.min(99, score));
}

function rankFromFollowers(followers: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (followers >= 1_000_000) return 'S';
  if (followers >= 250_000) return 'A';
  if (followers >= 50_000) return 'B';
  if (followers >= 10_000) return 'C';
  return 'D';
}

export async function GET(): Promise<Response> {
  const key = process.env.NEYNAR_API_KEY || process.env.FARCASTER_API_KEY;
  const DEV_FID = Number(process.env.NEXT_PUBLIC_DEV_FID || '250704');
  if (!key) return new NextResponse('missing NEYNAR_API_KEY', { status: 400 });

  // Placeholder: fetch top users from Neynar (implement later)
  const top: Array<{ fid: number; followers: number }> = [];

  let minted = 0;
  for (const u of top.slice(0, 1000)) {
    try {
      const intelligence = intelligenceFromFollowers(u.followers);
      const rank = rankFromFollowers(u.followers);
      const persona = JSON.stringify({ archetype: 'squad', followers: u.followers, rank, intelligence });
      await stSquadMintFromFarcaster(u.fid, u.followers, DEV_FID, intelligence, rank, persona);
      minted++;
    } catch (e) {
      console.warn('squad mint failed', u.fid, e);
    }
  }

  return NextResponse.json({ ok: true, minted });
}
