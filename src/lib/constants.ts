// Core constants for Football Caster

export const DEV_FID: number = parseInt(process.env.NEXT_PUBLIC_DEV_FID || '250704', 10);

const envChainId = (() => {
  const raw = (process.env.NEXT_PUBLIC_CHAIN_ID || process.env.CHAIN_ID || '').trim();
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 8453; // default Base mainnet
})();

export const CHAIN_CONFIG = {
  chainId: envChainId,
  name: 'Base',
  rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL || process.env.BASE_RPC_URL || 'https://mainnet.base.org',
} as const;

// Validate critical addresses at import time
function validateTreasuryAddress(): `0x${string}` {
  let address = process.env.NEXT_PUBLIC_TREASURY_ADDRESS || '';
  address = address.trim();
  // Strip surrounding quotes if present
  if ((address.startsWith('"') && address.endsWith('"')) || (address.startsWith("'") && address.endsWith("'"))) {
    address = address.slice(1, -1).trim();
  }
  
  if (!address || address === '0x0000000000000000000000000000000000000000') {
    throw new Error(
      'CRITICAL: NEXT_PUBLIC_TREASURY_ADDRESS must be configured and cannot be zero address. ' +
      'All payments would be lost to burn address. Set this in .env file.'
    );
  }
  
  // Basic address format validation
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error(
      `CRITICAL: NEXT_PUBLIC_TREASURY_ADDRESS has invalid format: ${address}. ` +
      'Must be a valid Ethereum address (0x followed by 40 hex characters).'
    );
  }
  
  return address as `0x${string}`;
}

export const CONTRACT_ADDRESSES = {
  fbc: (process.env.NEXT_PUBLIC_FBC_ADDRESS || '0xcb6e9f9bab4164eaa97c982dee2d2aaffdb9ab07') as `0x${string}`,
  treasury: validateTreasuryAddress(),
  marketplace: (process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  starterClaim: (process.env.NEXT_PUBLIC_STARTER_CLAIM_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
} as const;

export const ENTRY_FEE = {
  usd: 1,
  fbc: '1000000000000000000', // 1 FBC in wei (placeholder, actual conversion needed)
} as const;

export const MARKETPLACE_CONFIG = {
  holdPeriodDays: 7,
  standardFeeBps: 200, // 2%
  devFeeBps: 0, // 0% for dev FID
  offerMaxDeviationPercent: 25,
} as const;

export const AUCTION_CONFIG = {
  durationHours: 48,
  minIncrementBps: 200, // 2%
  minIncrementFbc: '1000000000000000000', // 1 FBC
  antiSnipeWindowMinutes: 3,
  antiSnipeExtendMinutes: 3,
} as const;



export const FORMATIONS = [
  { id: '442', name: '4-4-2', positions: { def: 4, mid: 4, fwd: 2 } },
  { id: '433', name: '4-3-3', positions: { def: 4, mid: 3, fwd: 3 } },
  { id: '451', name: '4-5-1', positions: { def: 4, mid: 5, fwd: 1 } },
  { id: '352', name: '3-5-2', positions: { def: 3, mid: 5, fwd: 2 } },
  { id: '343', name: '3-4-3', positions: { def: 3, mid: 4, fwd: 3 } },
  { id: '532', name: '5-3-2', positions: { def: 5, mid: 3, fwd: 2 } },
] as const;

export const COACH_STYLES = [
  { id: 'attacking', name: 'Attacking', bonus: 'offense' },
  { id: 'defensive', name: 'Defensive', bonus: 'defense' },
  { id: 'possession', name: 'Possession', bonus: 'control' },
  { id: 'counter', name: 'Counter-Attack', bonus: 'speed' },
  { id: 'balanced', name: 'Balanced', bonus: 'chemistry' },
] as const;

export const MORALE_FACTORS = {
  teamPerformance: { weight: 0.3, label: 'Team Performance' },
  usage: { weight: 0.25, label: 'Playing Time' },
  chemistry: { weight: 0.2, label: 'Team Chemistry' },
  transfer: { weight: 0.15, label: 'Recent Transfer' },
  social: { weight: 0.1, label: 'Social Engagement' },
} as const;

export const STADIUM_LEVELS = [
  { level: 1, capacity: 5000, homeAdvantage: 1, cost: 0 },
  { level: 2, capacity: 10000, homeAdvantage: 2, cost: 50 },
  { level: 3, capacity: 20000, homeAdvantage: 3, cost: 150 },
  { level: 4, capacity: 40000, homeAdvantage: 5, cost: 400 },
  { level: 5, capacity: 80000, homeAdvantage: 8, cost: 1000 },
] as const;

export const KIT_COLORS = [
  { id: 'red', name: 'Classic Red', hex: '#DC2626' },
  { id: 'blue', name: 'Royal Blue', hex: '#2563EB' },
  { id: 'green', name: 'Pitch Green', hex: '#16A34A' },
  { id: 'yellow', name: 'Golden Yellow', hex: '#EAB308' },
  { id: 'black', name: 'Midnight Black', hex: '#0F172A' },
  { id: 'white', name: 'Pure White', hex: '#F8FAFC' },
  { id: 'orange', name: 'Tangerine', hex: '#EA580C' },
  { id: 'purple', name: 'Royal Purple', hex: '#9333EA' },
] as const;

export const API_ENDPOINTS = {
  starter: {
    quote: '/api/starter/quote',
    verify: '/api/starter/verify',
    status: '/api/starter/status',
  },
  market: {
    listings: '/api/market/listings',
    buy: '/api/market/buy',
  },
  auction: {
    create: '/api/auctions',
    bid: '/api/auctions/bid',
    buyNow: '/api/auctions/buy-now',
    info: '/api/auctions/[id]/info',
    finalize: '/api/auctions/finalize',
  },
  inbox: '/api/inbox',
  pvp: {
    challenge: '/api/pvp/challenge',
    accept: '/api/pvp/accept',
    current: '/api/pvp/current',
    submitResult: '/api/pvp/submit_result',
  },
  auth: {
    me: '/api/auth/me',
    link: '/api/auth/link',
  },
  players: {
    mine: '/api/players/mine',
  },
  season: {
    leaderboard: '/api/season/leaderboard',
  },
  pricing: {
    fbcUsd: '/api/pricing/fbc-usd',
    quote: '/api/pricing/quote',
  },
} as const;
