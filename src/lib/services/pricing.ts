/**
 * Pricing Service - FBC/USD price fetching
 * Primary: Clanker, Fallback: Dexscreener
 */


const CLANKER_URL = 'https://www.clanker.world/clanker/0xcb6e9f9bab4164eaa97c982dee2d2aaffdb9ab07';
const DEXSCREENER_URL = 'https://api.dexscreener.com/latest/dex/tokens/0xcb6e9f9bab4164eaa97c982dee2d2aaffdb9ab07';
const CUSTOM_PRICE_URL = process.env.NEXT_PUBLIC_PRICE_URL || process.env.PRICE_URL || '';

interface PriceData {
  priceUsd: string;
  source: 'clanker' | 'dexscreener' | 'custom';
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
    const pair = data.pairs?.[0];
    
    if (pair?.priceUsd) {
      return pair.priceUsd;
    }
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
    const contentType = response.headers.get('content-type') || '';

    // Try JSON first when possible
    if (contentType.includes('application/json')) {
      const data = await response.json().catch(() => null);
      if (data) {
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
      }
    }

    // Fallback: attempt to parse from text
    const text = contentType.includes('application/json') ? JSON.stringify(await response.json().catch(() => ({}))) : await response.text();
    // Look for explicit priceUsd fields first
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

  // Prefer custom endpoint when provided, then Dexscreener, fallback to Clanker HTML
  let priceUsd: string | null = null;
  let source: 'clanker' | 'dexscreener' | 'custom' = 'dexscreener';

  if (CUSTOM_PRICE_URL) {
    priceUsd = await fetchFromCustom();
    source = 'custom';
  }
  if (!priceUsd) {
    priceUsd = await fetchFromDexscreener();
    source = 'dexscreener';
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
