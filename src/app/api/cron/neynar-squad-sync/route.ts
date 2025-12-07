import { badRequest, ok } from '@/lib/api/http';
import { stSquadMintFromFarcaster } from '@/lib/spacetime/api';
import { fetchTopFarcasterUsers } from '@/lib/services/neynar';
import { calculateRankFromFollowers, calculateIntelligenceFromFollowers } from '@/lib/neynar/score';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Scoring is centralized in lib/neynar/score

export async function GET(): Promise<Response> {
  const key = process.env.NEYNAR_API_KEY || process.env.FARCASTER_API_KEY;
  const DEV_FID = Number(process.env.NEXT_PUBLIC_DEV_FID || '250704');
  if (!key) return badRequest('missing NEYNAR_API_KEY');

  const users = await fetchTopFarcasterUsers(250);

  let minted = 0;
  for (const u of users.slice(0, 1000)) {
    try {
      const intelligence = calculateIntelligenceFromFollowers(u.followers || 0);
      const rank = calculateRankFromFollowers(u.followers || 0);
      const persona = JSON.stringify({ archetype: 'squad', followers: u.followers, rank, intelligence });
      await stSquadMintFromFarcaster(u.fid, u.followers || 0, DEV_FID, intelligence, rank, persona);
      minted++;
    } catch (e) {
      console.warn('squad mint failed', u.fid, e);
    }
  }

  return ok({ minted });
}
