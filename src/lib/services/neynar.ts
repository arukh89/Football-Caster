import { env } from 'process';

export interface NeynarUser {
  fid: number;
  username?: string | null;
  display_name?: string | null;
  bio?: string | null;
  followers?: number | null;
}

function getBase(): string {
  const base = (env.NEYNAR_API_BASE || 'https://api.neynar.com').replace(/\/$/, '');
  return base;
}

function getKey(): string | null {
  return env.NEYNAR_API_KEY || null;
}

async function tryJson(url: string, headers: Record<string,string>): Promise<any | null> {
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch {
    return null;
  }
}

export async function fetchTopFarcasterUsers(limit = 1000): Promise<NeynarUser[]> {
  const key = getKey();
  if (!key) return [];
  const base = getBase();
  const headers = {
    'accept': 'application/json',
    'api_key': key,
  } as Record<string, string>;

  // Try a few known/popular endpoints; stop at first success
  const candidates = [
    `${base}/v2/farcaster/users/top?limit=${limit}`,
    `${base}/v2/farcaster/users?sort=followers&limit=${limit}`,
    `${base}/v2/farcaster/user/popular?limit=${limit}`,
  ];

  let data: any = null;
  for (const url of candidates) {
    data = await tryJson(url, headers);
    if (data) break;
  }
  if (!data) return [];

  // Attempt to normalize a variety of shapes
  const arr: any[] = Array.isArray(data) ? data
    : Array.isArray(data.users) ? data.users
    : Array.isArray(data.result) ? data.result
    : Array.isArray(data.data) ? data.data
    : Array.isArray(data.items) ? data.items
    : [];

  const out: NeynarUser[] = arr.map((u) => ({
    fid: Number(u.fid ?? u.user?.fid ?? u.id ?? 0),
    username: u.username ?? u.user?.username ?? null,
    display_name: u.display_name ?? u.user?.display_name ?? null,
    bio: u.profile?.bio?.text ?? u.bio ?? null,
    followers: Number(u.follower_count ?? u.followers ?? u.stats?.followers ?? 0) || null,
  }))
  .filter((u) => Number.isInteger(u.fid) && u.fid > 0)
  .slice(0, Math.max(1, Math.min(1000, limit)));

  return out;
}

export async function fetchFarcasterUser(fid: number): Promise<NeynarUser | null> {
  const key = getKey();
  if (!key || !Number.isInteger(fid) || fid <= 0) return null;
  const base = getBase();
  const headers = {
    accept: 'application/json',
    api_key: key,
  } as Record<string, string>;

  const urls = [
    `${base}/v2/farcaster/user?fid=${fid}`,
    `${base}/v2/farcaster/users?fids=${fid}`,
    `${base}/v2/farcaster/user/by_id?fid=${fid}`,
  ];

  let data: any = null;
  for (const url of urls) {
    data = await tryJson(url, headers);
    if (data) break;
  }
  if (!data) return null;

  const u = Array.isArray(data)
    ? data.find((x: any) => Number(x?.fid ?? x?.user?.fid) === fid)
    : Array.isArray(data.users)
      ? data.users.find((x: any) => Number(x?.fid ?? x?.user?.fid) === fid)
      : data.user || data.result || data.data || data;

  if (!u) return null;

  const out: NeynarUser = {
    fid: Number(u.fid ?? u.user?.fid ?? fid),
    username: u.username ?? u.user?.username ?? null,
    display_name: u.display_name ?? u.user?.display_name ?? null,
    bio: u.profile?.bio?.text ?? u.bio ?? null,
    followers: Number(u.follower_count ?? u.followers ?? u.stats?.followers ?? 0) || null,
  };
  if (!Number.isInteger(out.fid) || out.fid <= 0) return null;
  return out;
}

export function rankFromFollowers(followers: number | null | undefined): string {
  const f = followers || 0;
  if (f >= 100_000) return 'S';
  if (f >= 50_000) return 'A';
  if (f >= 10_000) return 'B';
  if (f >= 1000) return 'C';
  return 'D';
}

export function intelligenceFromFollowers(followers: number | null | undefined): number {
  const f = followers || 0;
  const capped = Math.min(100_000, Math.max(0, f));
  // Map 0..100k => 30..95 (arbitrary but bounded)
  const x = 30 + Math.round((capped / 100_000) * 65);
  return Math.max(0, Math.min(100, x));
}
