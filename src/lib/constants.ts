// Core constants for Football Caster

export const DEV_FID: number = parseInt(process.env.NEXT_PUBLIC_DEV_FID || '250704', 10);

const envChainId = (() => {
  const raw = (process.env.NEXT_PUBLIC_CHAIN_ID || '').trim();
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 8453; // default Base mainnet
})();

export const CHAIN_CONFIG = {
  chainId: envChainId,
  name: 'Base',
  rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org',
} as const;

// Canonical token addresses on Base mainnet
export const TOKEN_ADDRESSES = {
  // Native USDC on Base (Coinbase)
  usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`,
  // Canonical WETH on Base
  weth: '0x4200000000000000000000000000000000000006' as `0x${string}`,
} as const;

// USDC addresses list (env-extendable; env takes precedence)
export const USDC_ADDRESSES: readonly `0x${string}`[] = (() => {
  const env = (process.env.NEXT_PUBLIC_USDC_ADDRESSES || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^0x[a-fA-F0-9]{40}$/.test(s)) as `0x${string}`[];
  const uniq = new Set<string>([...env.map((x) => x.toLowerCase()), TOKEN_ADDRESSES.usdc.toLowerCase()]);
  return Array.from(uniq).map((s) => ('0x' + s.replace(/^0x/, '')) as `0x${string}`);
})();

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



export const FORMATIONS = [
  { id: '442', name: '4-4-2', positions: { def: 4, mid: 4, fwd: 2 } },
  { id: '433', name: '4-3-3', positions: { def: 4, mid: 3, fwd: 3 } },
  { id: '451', name: '4-5-1', positions: { def: 4, mid: 5, fwd: 1 } },
  { id: '352', name: '3-5-2', positions: { def: 3, mid: 5, fwd: 2 } },
  { id: '343', name: '3-4-3', positions: { def: 3, mid: 4, fwd: 3 } },
  { id: '532', name: '5-3-2', positions: { def: 5, mid: 3, fwd: 2 } },
] as const;

export const API_ENDPOINTS = {
  starter: {
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
