/**
 * Pricing Service - FBC/USD price fetching
 * Sources priority: 0x/Matcha → Custom URL → Dexscreener → Clanker
 */

import { CONTRACT_ADDRESSES, CHAIN_CONFIG } from '@/lib/constants';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const CLANKER_URL = 'https://www.clanker.world/clanker/0xcb6e9f9bab4164eaa97c982dee2d2aaffdb9ab07';
const DEXSCREENER_URL = 'https://api.dexscreener.com/latest/dex/tokens/0xcb6e9f9bab4164eaa97c982dee2d2aaffdb9ab07';
const CUSTOM_PRICE_URL = process.env.NEXT_PUBLIC_PRICE_URL || process.env.PRICE_URL || '';
const OX_PRICE_URL = 'https://base.api.0x.org/swap/v1/price';
// USDC on Base (official). If bridged USDbC is needed we can add later.
const USDC_BASES: `0x${string}`[] = [
  '0x833589fCD6edb6E08f4c7C76f99918fCae4f2dE0',
];
const WETH_BASE: `0x${string}` = '0x4200000000000000000000000000000000000006';
// Uniswap V3 Factory on Base (per official deployments)
const UNISWAP_V3_FACTORY: `0x${string}` = '0x33128a8fC17869897dcE68Ed026d694621f6FDfD';
const V3_FEE_TIERS: number[] = [100, 500, 3000, 10000];

interface PriceData {
  priceUsd: string;
  source: 'clanker' | 'dexscreener' | 'custom' | '0x';
  timestamp: number;
}

let cachedPrice: PriceData | null = null;
const CACHE_TTL = 30 * 1000; // 30 seconds

// lightweight ERC20 decimals ABI
const ERC20_DECIMALS_ABI = [
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
];

const publicClient = createPublicClient({ chain: base, transport: http(CHAIN_CONFIG.rpcUrl) });

async function getTokenDecimals(addr: `0x${string}`): Promise<number> {
  try {
    const dec = await publicClient.readContract({
      address: addr,
      abi: ERC20_DECIMALS_ABI as any,
      functionName: 'decimals',
      args: [],
    });
    return Number(dec) || 18;
  } catch {
    return 18;
  }
}

// Convert a BigInt and decimals to a decimal string without losing precision
function formatUnitsString(value: bigint, decimals: number): string {
  const neg = value < 0n;
  const v = neg ? -value : value;
  const base = 10n ** BigInt(decimals);
  const integer = v / base;
  const fraction = v % base;
  if (fraction === 0n) return `${neg ? '-' : ''}${integer.toString()}`;
  // pad fraction to length "decimals"
  const fracStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${neg ? '-' : ''}${integer.toString()}.${fracStr}`;
}

// Compute (numerator / denominator) as decimal string with given precision
function divToDecimalString(numerator: bigint, denominator: bigint, precision = 18): string {
  if (denominator === 0n) return '0';
  const scale = 10n ** BigInt(precision);
  const scaled = (numerator * scale) / denominator; // floor division
  const intPart = scaled / scale;
  const fracPart = (scaled % scale).toString().padStart(precision, '0').replace(/0+$/, '');
  return fracPart.length ? `${intPart.toString()}.${fracPart}` : intPart.toString();
}

// Minimal ABIs for Uniswap V3
const UNISWAP_V3_FACTORY_ABI = [
  {
    name: 'getPool',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'fee', type: 'uint24' },
    ],
    outputs: [{ name: 'pool', type: 'address' }],
  },
] as const;

const UNISWAP_V3_POOL_ABI = [
  {
    name: 'slot0',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'observationIndex', type: 'uint16' },
      { name: 'observationCardinality', type: 'uint16' },
      { name: 'observationCardinalityNext', type: 'uint16' },
      { name: 'feeProtocol', type: 'uint8' },
      { name: 'unlocked', type: 'bool' },
    ],
  },
  {
    name: 'liquidity',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint128' }],
  },
] as const;

function sortTokens(a: `0x${string}`, b: `0x${string}`): [`0x${string}`, `0x${string}`] {
  return a.toLowerCase() < b.toLowerCase() ? [a, b] : [b, a];
}

async function getPoolAddress(tokenA: `0x${string}`, tokenB: `0x${string}`, fee: number): Promise<`0x${string}` | null> {
  const [t0, t1] = sortTokens(tokenA, tokenB);
  const pool = await publicClient.readContract({
    address: UNISWAP_V3_FACTORY,
    abi: UNISWAP_V3_FACTORY_ABI as any,
    functionName: 'getPool',
    args: [t0, t1, fee],
  });
  const addr = (pool as string).toLowerCase();
  if (addr === '0x0000000000000000000000000000000000000000') return null;
  return pool as `0x${string}`;
}

async function readPoolState(pool: `0x${string}`): Promise<{ sqrtPriceX96: bigint; liquidity: bigint } | null> {
  try {
    const [slot0, liquidity] = await Promise.all([
      publicClient.readContract({ address: pool, abi: UNISWAP_V3_POOL_ABI as any, functionName: 'slot0', args: [] }) as Promise<any>,
      publicClient.readContract({ address: pool, abi: UNISWAP_V3_POOL_ABI as any, functionName: 'liquidity', args: [] }) as Promise<bigint>,
    ]);
    const sqrtPriceX96 = BigInt(slot0?.[0] ?? slot0?.sqrtPriceX96 ?? 0);
    return { sqrtPriceX96, liquidity: BigInt(liquidity) };
  } catch {
    return null;
  }
}

function pow10(n: number): bigint { return 10n ** BigInt(n); }

function usdPerFbcFromSqrt(
  fbc: `0x${string}`,
  usdc: `0x${string}`,
  token0: `0x${string}`,
  sqrtPriceX96: bigint,
  fbcDecimals: number,
  usdcDecimals: number,
): string {
  // price1Per0 (decimal-adjusted) = (sqrtPriceX96^2 / 2^192) * 10^(decimals1 - decimals0)
  // We want USD/FBC.
  const ratioX192 = sqrtPriceX96 * sqrtPriceX96;
  const q192 = 2n ** 192n;

  if (token0.toLowerCase() === fbc.toLowerCase()) {
    // token0 = FBC (d0=fbc), token1 = USDC (d1=usdc)
    // USD/FBC = ratioX192 / q192 * 10^(usdc - fbc)
    const numerator = ratioX192 * pow10(usdcDecimals);
    const denominator = q192 * pow10(fbcDecimals);
    return divToDecimalString(numerator, denominator, 12);
  } else {
    // token0 = USDC (d0=usdc), token1 = FBC (d1=fbc)
    // FBC/USDC = ratioX192 / q192 * 10^(fbc - usdc)
    // USD/FBC = 1 / (FBC/USDC) = q192 / ratioX192 * 10^(usdc - fbc)
    const numerator = q192 * pow10(usdcDecimals);
    const denominator = ratioX192 * pow10(fbcDecimals);
    return divToDecimalString(numerator, denominator, 12);
  }
}

async function quoteUsdPerFbcFromPool(tokenA: `0x${string}`, tokenB: `0x${string}`, fee: number): Promise<string | null> {
  const pool = await getPoolAddress(tokenA, tokenB, fee);
  if (!pool) return null;
  const state = await readPoolState(pool);
  if (!state || state.liquidity <= 0n || state.sqrtPriceX96 === 0n) return null;
  const [t0, t1] = sortTokens(tokenA, tokenB);
  const fbc = CONTRACT_ADDRESSES.fbc;
  const usdc = USDC_BASES[0];
  const [fbcDec, usdcDec] = await Promise.all([
    getTokenDecimals(fbc),
    getTokenDecimals(usdc),
  ]);
  return usdPerFbcFromSqrt(fbc, usdc, t0, state.sqrtPriceX96, fbcDec, usdcDec);
}

async function fetchFromUniswapV3Onchain(): Promise<string | null> {
  try {
    const fbc = CONTRACT_ADDRESSES.fbc;
    const usdc = USDC_BASES[0];

    // 1) Try direct USDC-FBC pools across common fee tiers
    for (const fee of V3_FEE_TIERS) {
      const price = await quoteUsdPerFbcFromPool(usdc, fbc, fee);
      if (price) return price;
    }

    // 2) Try via WETH: USD/WETH * WETH/FBC
    // USDC-WETH
    let usdPerWeth: string | null = null;
    for (const fee of V3_FEE_TIERS) {
      const pool = await getPoolAddress(usdc, WETH_BASE, fee);
      if (!pool) continue;
      const state = await readPoolState(pool);
      if (!state || state.liquidity <= 0n || state.sqrtPriceX96 === 0n) continue;
      const [t0, t1] = sortTokens(usdc, WETH_BASE);
      const [dec0, dec1] = await Promise.all([
        getTokenDecimals(t0),
        getTokenDecimals(t1),
      ]);
      // price1Per0 = t1 per t0; we want USD/WETH
      const ratioX192 = state.sqrtPriceX96 * state.sqrtPriceX96;
      const q192 = 2n ** 192n;
      const factorNum = pow10(dec1); // 10^decimals(token1)
      const factorDen = pow10(dec0); // 10^decimals(token0)
      const price1Per0 = divToDecimalString(ratioX192 * factorNum, q192 * factorDen, 12);
      let val: string;
      if (t0.toLowerCase() === WETH_BASE.toLowerCase()) {
        // t0=WETH, t1=USDC => price1Per0 = USD/WETH already
        val = price1Per0;
      } else {
        // t0=USDC, t1=WETH => price1Per0 = WETH/USDC; invert to USD/WETH
        // USD/WETH = 1 / (WETH/USDC)
        const [i, f = ''] = price1Per0.split('.');
        const scaled = BigInt(i + (f + '000000000000').slice(0, 12));
        const invScaled = (10n ** 12n * 10n ** 12n) / scaled; // 1 / x with 12 precision
        const intPart = invScaled / (10n ** 12n);
        const frac = (invScaled % (10n ** 12n)).toString().padStart(12, '0').replace(/0+$/, '');
        val = frac.length ? `${intPart.toString()}.${frac}` : intPart.toString();
      }
      usdPerWeth = val;
      break;
    }

    if (!usdPerWeth) return null;

    // WETH-FBC
    let wethPerFbc: string | null = null;
    for (const fee of V3_FEE_TIERS) {
      const pool = await getPoolAddress(WETH_BASE, fbc, fee);
      if (!pool) continue;
      const state = await readPoolState(pool);
      if (!state || state.liquidity <= 0n || state.sqrtPriceX96 === 0n) continue;
      const [t0, t1] = sortTokens(WETH_BASE, fbc);
      const [dec0, dec1] = await Promise.all([
        getTokenDecimals(t0),
        getTokenDecimals(t1),
      ]);
      // price1Per0 = t1 per t0
      const ratioX192 = state.sqrtPriceX96 * state.sqrtPriceX96;
      const q192 = 2n ** 192n;
      const factorNum = pow10(dec1);
      const factorDen = pow10(dec0);
      const price1Per0 = divToDecimalString(ratioX192 * factorNum, q192 * factorDen, 12);
      let val: string;
      if (t0.toLowerCase() === fbc.toLowerCase()) {
        // t0=FBC, t1=WETH => price1Per0 = WETH per FBC (wanted)
        val = price1Per0;
      } else {
        // t0=WETH, t1=FBC => price1Per0 = FBC per WETH; invert to WETH/FBC
        const [i, f = ''] = price1Per0.split('.');
        const scaled = BigInt(i + (f + '000000000000').slice(0, 12));
        const invScaled = (10n ** 12n * 10n ** 12n) / scaled;
        const intPart = invScaled / (10n ** 12n);
        const frac = (invScaled % (10n ** 12n)).toString().padStart(12, '0').replace(/0+$/, '');
        val = frac.length ? `${intPart.toString()}.${frac}` : intPart.toString();
      }
      wethPerFbc = val;
      break;
    }

    if (!wethPerFbc) return null;

    // USD/FBC = (USD/WETH) * (WETH/FBC)
    // Multiply two decimal strings precisely via BigInt with 12+12 precision
    const toScaled = (s: string) => {
      const [i, f = ''] = s.split('.');
      return BigInt(i + (f + '000000000000').slice(0, 12));
    };
    const usdPerWethScaled = toScaled(usdPerWeth);
    const wethPerFbcScaled = toScaled(wethPerFbc);
    const productScaled = (usdPerWethScaled * wethPerFbcScaled) / (10n ** 12n);
    const intPart = productScaled / (10n ** 12n);
    const frac = (productScaled % (10n ** 12n)).toString().padStart(12, '0').replace(/0+$/, '');
    return frac.length ? `${intPart.toString()}.${frac}` : intPart.toString();
  } catch (e) {
    console.error('Uniswap v3 on-chain price error:', e);
    return null;
  }
}

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
      // Ask for price buying FBC with exactly 1 USDC (6 decimals)
      const url = `${OX_PRICE_URL}?sellToken=${usdc}&buyToken=${fbc}&sellAmount=1000000`;
      const res = await fetch(url, {
        headers: {
          'accept': 'application/json',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      if (!res.ok) continue;
      const data = await res.json().catch(() => null);
      const buyAmountStr: string | undefined = data?.buyAmount; // in FBC base units (token decimals)
      if (!buyAmountStr) continue;
      let buyAmount: bigint;
      try { buyAmount = BigInt(buyAmountStr); } catch { continue; }
      if (buyAmount <= 0n) continue;
      const fbcDecimals = await getTokenDecimals(CONTRACT_ADDRESSES.fbc);
      // USD per FBC = 1 / (FBC per 1 USD)
      // FBC per 1 USD = buyAmount / 10^fbcDecimals
      // => USD/FBC = 10^fbcDecimals / buyAmount
      const numerator = 10n ** BigInt(fbcDecimals);
      const usdPerFbcStr = divToDecimalString(numerator, buyAmount, 12);
      return usdPerFbcStr;
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

  // Prefer Uniswap v3 on-chain, then 0x (Matcha), then custom endpoint, then Dexscreener, then Clanker HTML
  let priceUsd: string | null = null;
  let source: 'clanker' | 'dexscreener' | 'custom' | '0x' | 'uniswap_v3' = 'dexscreener';

  // Uniswap v3 on-chain
  priceUsd = await fetchFromUniswapV3Onchain();
  if (priceUsd) source = 'uniswap_v3';

  // 0x/Matcha
  if (!priceUsd) {
    priceUsd = await fetchFrom0x();
    if (priceUsd) source = '0x';
  }

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
