/**
 * Pricing Service - FBC/USD price fetching
 * Sources priority: 0x/Matcha → Custom URL → Dexscreener → Clanker
 */

import { CONTRACT_ADDRESSES } from '@/lib/constants';

const CLANKER_URL = 'https://www.clanker.world/clanker/0xcb6e9f9bab4164eaa97c982dee2d2aaffdb9ab07';
const DEXSCREENER_URL = 'https://api.dexscreener.com/latest/dex/tokens/0xcb6e9f9bab4164eaa97c982dee2d2aaffdb9ab07';
const CUSTOM_PRICE_URL = process.env.NEXT_PUBLIC_PRICE_URL || process.env.PRICE_URL || '';
const OX_PRICE_URL = 'https://base.api.0x.org/swap/v1/price';
// USDC variants on Base (official + bridged USDbC)
const USDC_BASES: `0x${string}`[] = [
  '0x833589fCD6edb6E08f4c7C76f99918fCae4f2dE0', // USDC (official)
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', // USDbC (legacy)
];

interface PriceData {
  priceUsd: string;
  source: 'clanker' | 'dexscreener' | 'custom' | '0x';
  timestamp: number;
}

let cachedPrice: PriceData | null = null;
const CACHE_TTL = 30 * 1000; // 30 seconds

/**
 * Fetch FBC price from Clanker
 */
async function fetchFromClanker(): Promise<string | null> {
  try {
    const response = await fetch(CLANKER_URL);
    if (!response.ok) return null;

    const html = await response.text();
    
    // Parse price from Clanker HTML
    const priceMatch = html.match(/\$([0-9.]+)/);
    if (priceMatch && priceMatch[1]) {
      return priceMatch[1];
    }
    return null;
  } catch (error) {
    console.error('Clanker fetch error:', error);
    return null;
  }
}

/**
 * Fetch price via 0x (Matcha) aggregator on Base chain.
 * We request a quote for buying exactly 1e18 wei of FBC with USDC and
 * convert returned sellAmount (USDC in 6 decimals) to USD per 1 FBC.
 */
async function fetchFrom0x(): Promise<string | null> {
  try {
    const fbc = CONTRACT_ADDRESSES.fbc;
    // Try both USDC variants; take the first successful response
    for (const usdc of USDC_BASES) {
      const url = `${OX_PRICE_URL}?sellToken=${usdc}&buyToken=${fbc}&sellAmount=1000000`;
      const res = await fetch(url, {
        headers: {
          'accept': 'application/json',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      if (!res.ok) continue;
      const data = await res.json().catch(() => null);
      const buyAmount = data?.buyAmount; // in FBC base units (18 decimals)
      if (!buyAmount) continue;
      const buyAmountNum = Number(buyAmount);
      if (!isFinite(buyAmountNum) || buyAmountNum <= 0) continue;
      const fbcPerUsd = buyAmountNum / 1e18; // FBC you get for 1 USDC
      if (!isFinite(fbcPerUsd) || fbcPerUsd <= 0) continue;
      const usdPerFbc = 1 / fbcPerUsd;
      return usdPerFbc.toString();
    }
    return null;
  } catch (err) {
    console.error('0x price fetch error:', err);
    return null;
  }
}

/**
 * Fetch FBC price from Dexscreener (fallback)
 */
async function fetchFromDexscreener(): Promise<string | null> {
  try {
    const response = await fetch(DEXSCREENER_URL, {
      headers: {
        'accept': 'application/json',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    if (!response.ok) return null;

    const data = await response.json();
    const pairs = (data.pairs || []) as any[];
    // Prefer Base chain pairs with highest liquidity
    const basePairs = pairs.filter((p) => (p?.chainId?.toString?.() === 'base' || /base/i.test(p?.chainId || '')) && p?.priceUsd);
    const sorted = (basePairs.length ? basePairs : pairs)
      .filter((p) => p?.priceUsd)
      .sort((a, b) => (Number(b?.liquidity?.usd || 0) - Number(a?.liquidity?.usd || 0)));
    const pair = sorted[0];
    if (pair?.priceUsd) return String(pair.priceUsd);
    return null;
  } catch (error) {
    console.error('Dexscreener fetch error:', error);
    return null;
  }
}

/**
 * Fetch FBC price from a custom endpoint if provided via env (NEXT_PUBLIC_PRICE_URL or PRICE_URL)
 * Accepts JSON payloads like { priceUsd: "0.123" } or { price_usd: 0.123 }.
 * Falls back to scanning text for a numeric USD value when JSON isn't available.
 */
async function fetchFromCustom(): Promise<string | null> {
  if (!CUSTOM_PRICE_URL) return null;
  try {
    const response = await fetch(CUSTOM_PRICE_URL, {
      headers: {
        'accept': 'application/json,*/*',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    const text = await response.text();

    // Try JSON first when possible (parse from text)
    try {
      const data = JSON.parse(text);
      const candidates = [
        (data as any).priceUsd,
        (data as any).price_usd,
        (data as any).price,
        (data as any).usd,
        (data as any)?.data?.priceUsd,
        (data as any)?.data?.price_usd,
      ];
      for (const c of candidates) {
        const v = typeof c === 'number' ? c : typeof c === 'string' ? parseFloat(c) : NaN;
        if (!isNaN(v) && v > 0) return String(v);
      }
    } catch {}

    // Fallback: attempt to parse numeric value from text
    // Look for explicit priceUsd fields first within the raw text
    let match = text.match(/priceUsd"?\s*[:=]\s*"?([0-9]+(?:\.[0-9]+)?)/i);
    if (match?.[1]) return match[1];
    // Generic $<number> pattern as a last resort
    match = text.match(/\$\s*([0-9]+(?:\.[0-9]+)?)/);
    if (match?.[1]) return match[1];
    return null;
  } catch (error) {
    console.error('Custom price fetch error:', error);
    return null;
  }
}

/**
 * Get current FBC/USD price with caching
 */
export async function getFBCPrice(): Promise<PriceData> {
  // Return cached price if valid
  if (cachedPrice && Date.now() - cachedPrice.timestamp < CACHE_TTL) {
    return cachedPrice;
  }

  // Prefer 0x (Matcha), then custom endpoint, then Dexscreener, then Clanker HTML
  let priceUsd: string | null = null;
  let source: 'clanker' | 'dexscreener' | 'custom' | '0x' = 'dexscreener';

  // 0x/Matcha
  priceUsd = await fetchFrom0x();
  if (priceUsd) source = '0x';

  // Custom URL
  if (!priceUsd && CUSTOM_PRICE_URL) {
    priceUsd = await fetchFromCustom();
    if (priceUsd) source = 'custom';
  }

  // Dexscreener
  if (!priceUsd) {
    priceUsd = await fetchFromDexscreener();
    if (priceUsd) source = 'dexscreener';
  }

  // Fallback to Clanker
  if (!priceUsd) {
    priceUsd = await fetchFromClanker();
    source = 'clanker';
  }

  if (!priceUsd) {
    throw new Error('Unable to fetch FBC price from any source');
  }

  // Validate price
  const price = parseFloat(priceUsd);
  if (isNaN(price) || price <= 0) {
    throw new Error('Invalid price data received');
  }

  // Cache and return
  cachedPrice = {
    priceUsd,
    source: source as any,
    timestamp: Date.now(),
  };

  return cachedPrice;
}

/**
 * Calculate FBC amount for USD value (strict, no floor)
 * Uses integer math to avoid floating point errors
 */
export function calculateFBCAmount(usdAmount: string, priceUsd: string): string {
  const usd = parseFloat(usdAmount);
  const price = parseFloat(priceUsd);

  if (isNaN(usd) || isNaN(price) || price <= 0) {
    throw new Error('Invalid USD or price value');
  }

  // Convert to wei: (usd / price) * 10^18
  // Use BigInt for precision
  // Convert to FBC with 18 decimals in wei:
  // (usd / price) * 10^18
  const usdWei = BigInt(Math.round(usd * 1e6)) * BigInt(1e12); // avoid float overflow
  const priceWei = BigInt(Math.round(price * 1e6)) * BigInt(1e12);
  const amountWei = usdWei * BigInt(1e18) / priceWei;

  return amountWei.toString();
}

/**
 * Get quote for USD amount in FBC wei
 */
export async function getQuote(usdAmount: string): Promise<{ amountWei: string; priceUsd: string; source: string }> {
  const priceData = await getFBCPrice();
  const amountWei = calculateFBCAmount(usdAmount, priceData.priceUsd);

  return {
    amountWei,
    priceUsd: priceData.priceUsd,
    source: priceData.source,
  };
}
