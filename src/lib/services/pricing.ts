/**
 * Pricing Service - FBC/USD price fetching
 * Primary: Clanker, Fallback: Dexscreener
 */


const CLANKER_URL = 'https://www.clanker.world/clanker/0xcb6e9f9bab4164eaa97c982dee2d2aaffdb9ab07';
const DEXSCREENER_URL = 'https://api.dexscreener.com/latest/dex/tokens/0xcb6e9f9bab4164eaa97c982dee2d2aaffdb9ab07';

interface PriceData {
  priceUsd: string;
  source: 'clanker' | 'dexscreener';
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
    const response = await fetch(DEXSCREENER_URL);
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
 * Get current FBC/USD price with caching
 */
export async function getFBCPrice(): Promise<PriceData> {
  // Return cached price if valid
  if (cachedPrice && Date.now() - cachedPrice.timestamp < CACHE_TTL) {
    return cachedPrice;
  }

  // Try Clanker first
  let priceUsd = await fetchFromClanker();
  let source: 'clanker' | 'dexscreener' = 'clanker';

  // Fallback to Dexscreener
  if (!priceUsd) {
    priceUsd = await fetchFromDexscreener();
    source = 'dexscreener';
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
    source,
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
