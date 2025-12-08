/**
 * Pricing Service - FBC/USD price fetching
 * Sources priority:
 *   Uniswap v4 TWAP → Uniswap v3 TWAP → 0x/Matcha → Dexscreener → GeckoTerminal → Uniswap v3 on-chain → Custom URL
 */

import { CONTRACT_ADDRESSES, CHAIN_CONFIG } from '@/lib/constants';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const DEXSCREENER_URL = 'https://api.dexscreener.com/latest/dex/tokens/0xcb6e9f9bab4164eaa97c982dee2d2aaffdb9ab07';
const CUSTOM_PRICE_URL = process.env.NEXT_PUBLIC_PRICE_URL || '';
const GECKO_POOL_ID_RAW = (process.env.NEXT_PUBLIC_GECKO_POOL_ID || '').trim();
const OX_PRICE_URL = 'https://base.api.0x.org/swap/v1/price';
// Optional manual override for local/dev: set any of these envs to a positive number
const PRICE_OVERRIDE_ENV = process.env.NEXT_PUBLIC_FBC_PRICE_USD;
// Dev convenience: in non-production, assume 1 FBC = $1 unless explicitly disabled
const ASSUME_ONE_USD: boolean = (
  (process.env.NEXT_PUBLIC_ASSUME_FBC_ONE_USD || (process.env.NODE_ENV !== 'production' ? 'true' : 'false'))
    .toString()
    .toLowerCase()
    .trim() !== 'false'
);
// USDC on Base (official). Allow extending via env (comma-separated addresses) without hardcoding unknowns.
const USDC_DEFAULTS: `0x${string}`[] = [
  // Native USDC on Base (official)
  '0x833589fcd6edb6e08f4c7c76f99918fcae4f2de0',
];
const USDC_ENV = (process.env.NEXT_PUBLIC_USDC_ADDRESSES || '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter((s) => /^0x[a-fA-F0-9]{40}$/.test(s)) as `0x${string}`[];
// Prefer env-provided addresses first, then fall back to defaults
const USDC_BASES: `0x${string}`[] = Array.from(new Set([...USDC_ENV, ...USDC_DEFAULTS]));
const WETH_BASE: `0x${string}` = '0x4200000000000000000000000000000000000006';
// Uniswap V3 Factory on Base (per official deployments)
const UNISWAP_V3_FACTORY: `0x${string}` = '0x33128a8fC17869897dcE68Ed026d694621f6FDfD';
const V3_FEE_TIERS: number[] = [100, 500, 3000, 10000];

// Uniswap V4 PoolManager (Base) – configurable via env
const UNISWAP_V4_POOL_MANAGER: `0x${string}` = (
  (process.env.NEXT_PUBLIC_UNISWAP_V4_POOL_MANAGER || '0x498581fF718922c3f8e6A244956aF099B2652b2b')
) as `0x${string}`;
// Optional known PoolId (bytes32) for FBC/WETH on v4
const UNISWAP_V4_FBC_WETH_POOL_ID: `0x${string}` | null = (() => {
  const s = process.env.NEXT_PUBLIC_UNISWAP_V4_FBC_WETH_POOL_ID || '';
  return /^0x[a-fA-F0-9]{64}$/.test(s.trim()) ? (s.trim() as `0x${string}`) : null;
})();

interface PriceData {
  priceUsd: string;
  source: 'dexscreener' | 'gecko' | 'custom' | '0x' | 'override' | 'uniswap_v3' | 'uniswap_v4';
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
  {
    name: 'observe',
    type: 'function',
    stateMutability: 'view',
    inputs: [ { name: 'secondsAgos', type: 'uint32[]' } ],
    outputs: [
      { name: 'tickCumulatives', type: 'int56[]' },
      { name: 'secondsPerLiquidityCumulativeX128', type: 'uint160[]' },
    ],
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

// token1 per token0 from sqrtPriceX96 with decimals
function price1Per0FromSqrtX96(
  sqrtPriceX96: bigint,
  dec0: number,
  dec1: number,
): string {
  // price1Per0 = (sqrt^2 / 2^192) * 10^(dec1 - dec0)
  const ratioX192 = sqrtPriceX96 * sqrtPriceX96;
  const q192 = 2n ** 192n;
  const numerator = ratioX192 * pow10(dec1);
  const denominator = q192 * pow10(dec0);
  return divToDecimalString(numerator, denominator, 12);
}

async function quoteUsdPerFbcFromPool(tokenA: `0x${string}`, tokenB: `0x${string}`, fee: number): Promise<string | null> {
  const pool = await getPoolAddress(tokenA, tokenB, fee);
  if (!pool) return null;
  const state = await readPoolState(pool);
  if (!state || state.liquidity <= 0n || state.sqrtPriceX96 === 0n) return null;
  const [t0, t1] = sortTokens(tokenA, tokenB);
  const fbc = CONTRACT_ADDRESSES.fbc;
  const usdc = USDC_BASES[0];
  const [dec0, dec1] = await Promise.all([
    getTokenDecimals(t0),
    getTokenDecimals(t1),
  ]);
  const p = price1Per0FromSqrtX96(state.sqrtPriceX96, dec0, dec1); // token1 per token0
  if (t0.toLowerCase() === fbc.toLowerCase()) {
    // token0=FBC, token1=USDC → p = USD/FBC
    return p;
  }
  // token0=USDC, token1=FBC → p = FBC/USD; invert
  const [i, f = ''] = p.split('.');
  const scaled = BigInt(i + (f + '000000000000').slice(0, 12));
  const invScaled = (10n ** 12n * 10n ** 12n) / scaled;
  const intPart = invScaled / (10n ** 12n);
  const frac = (invScaled % (10n ** 12n)).toString().padStart(12, '0').replace(/0+$/, '');
  return frac.length ? `${intPart.toString()}.${frac}` : intPart.toString();
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
      // Decimal normalization: 10^(dec0 - dec1)
      const factorNum = pow10(dec0); // token0 decimals
      const factorDen = pow10(dec1); // token1 decimals
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
      // Decimal normalization: 10^(dec0 - dec1)
      const factorNum = pow10(dec0);
      const factorDen = pow10(dec1);
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

const TWAP_SECONDS: number = (() => {
  const raw = Number(process.env.NEXT_PUBLIC_TWAP_SECONDS || '600');
  if (!isFinite(raw) || raw <= 0) return 600;
  return Math.min(Math.max(Math.floor(raw), 60), 3600); // clamp 1m..60m
})();

function pow1p0001(tick: number): number {
  // price1Per0 = 1.0001^tick
  // Use JS double precision; sufficient for quoting display purposes.
  return Math.pow(1.0001, tick);
}

function price1Per0FromTick(
  avgTick: number,
  dec0: number,
  dec1: number,
): string {
  // price1Per0 = 1.0001^tick * 10^(dec1 - dec0)
  const p = Math.pow(1.0001, avgTick) * Math.pow(10, dec1 - dec0);
  return String(p);
}

async function observeAvgTick(pool: `0x${string}`, seconds: number): Promise<number | null> {
  try {
    const res: any = await publicClient.readContract({
      address: pool,
      abi: UNISWAP_V3_POOL_ABI as any,
      functionName: 'observe',
      args: [[seconds, 0]],
    });
    const ticks: any[] = res?.[0] ?? res?.tickCumulatives;
    if (!ticks || ticks.length < 2) return null;
    const t0 = BigInt(ticks[0]);
    const t1 = BigInt(ticks[1]);
    const delta = t1 - t0;
    // integer division toward zero; sufficient
    const avg = Number(delta / BigInt(seconds));
    return avg;
  } catch {
    return null;
  }
}

async function quoteUsdPerFbcFromPoolTwap(tokenA: `0x${string}`, tokenB: `0x${string}`, fee: number, seconds = TWAP_SECONDS): Promise<string | null> {
  const pool = await getPoolAddress(tokenA, tokenB, fee);
  if (!pool) return null;
  const avgTick = await observeAvgTick(pool, seconds);
  if (avgTick === null) return null;
  const [t0, t1] = sortTokens(tokenA, tokenB);
  const [dec0, dec1] = await Promise.all([
    getTokenDecimals(t0),
    getTokenDecimals(t1),
  ]);
  const p = price1Per0FromTick(avgTick, dec0, dec1); // token1 per token0
  const fbc = CONTRACT_ADDRESSES.fbc;
  if (t0.toLowerCase() === fbc.toLowerCase()) {
    // token0=FBC → token1 is USDC → p = USD/FBC
    return p;
  }
  // token0=USDC → p = FBC/USD → invert
  const [i, f = ''] = p.split('.');
  const scaled = BigInt(i + (f + '000000000000').slice(0, 12));
  const invScaled = (10n ** 12n * 10n ** 12n) / scaled;
  const intPart = invScaled / (10n ** 12n);
  const frac = (invScaled % (10n ** 12n)).toString().padStart(12, '0').replace(/0+$/, '');
  return frac.length ? `${intPart.toString()}.${frac}` : intPart.toString();
}

async function fetchFromUniswapV3Twap(): Promise<string | null> {
  try {
    const fbc = CONTRACT_ADDRESSES.fbc;
    const usdc = USDC_BASES[0];

    // 1) Try direct USDC-FBC pools across fee tiers using TWAP
    for (const fee of V3_FEE_TIERS) {
      const price = await quoteUsdPerFbcFromPoolTwap(usdc, fbc, fee, TWAP_SECONDS);
      if (price) return price;
    }

    // 2) TWAP multi-hop via WETH: USD/WETH (USDC-WETH) * WETH/FBC (WETH-FBC)
    // Compute each leg carefully with proper tick → price conversion and decimals.
    let usdPerWeth: string | null = null;
    for (const fee of V3_FEE_TIERS) {
      const pool = await getPoolAddress(usdc, WETH_BASE, fee);
      if (!pool) continue;
      const avgTick = await observeAvgTick(pool, TWAP_SECONDS);
      if (avgTick === null) continue;
      const [t0, t1] = sortTokens(usdc, WETH_BASE);
      const [dec0, dec1] = await Promise.all([ getTokenDecimals(t0), getTokenDecimals(t1) ]);
      const p = price1Per0FromTick(avgTick, dec0, dec1); // token1 per token0
      if (t0.toLowerCase() === WETH_BASE.toLowerCase()) {
        // t0=WETH → p = USDC per WETH
        usdPerWeth = p;
      } else {
        // t0=USDC → p = WETH per USDC → invert
        const [i, f = ''] = p.split('.');
        const scaled = BigInt(i + (f + '000000000000').slice(0, 12));
        const invScaled = (10n ** 12n * 10n ** 12n) / scaled;
        const intPart = invScaled / (10n ** 12n);
        const frac = (invScaled % (10n ** 12n)).toString().padStart(12, '0').replace(/0+$/, '');
        usdPerWeth = frac.length ? `${intPart.toString()}.${frac}` : intPart.toString();
      }
      break;
    }
    if (!usdPerWeth) return null;

    let wethPerFbc: string | null = null;
    for (const fee of V3_FEE_TIERS) {
      const pool = await getPoolAddress(WETH_BASE, fbc, fee);
      if (!pool) continue;
      const avgTick = await observeAvgTick(pool, TWAP_SECONDS);
      if (avgTick === null) continue;
      const [t0, t1] = sortTokens(WETH_BASE, fbc);
      const [dec0, dec1] = await Promise.all([ getTokenDecimals(t0), getTokenDecimals(t1) ]);
      const p = price1Per0FromTick(avgTick, dec0, dec1); // token1 per token0
      if (t0.toLowerCase() === fbc.toLowerCase()) {
        // t0=FBC → p = WETH per FBC
        wethPerFbc = p;
      } else {
        // t0=WETH → p = FBC per WETH → invert
        const [i, f = ''] = p.split('.');
        const scaled = BigInt(i + (f + '000000000000').slice(0, 12));
        const invScaled = (10n ** 12n * 10n ** 12n) / scaled;
        const intPart = invScaled / (10n ** 12n);
        const frac = (invScaled % (10n ** 12n)).toString().padStart(12, '0').replace(/0+$/, '');
        wethPerFbc = frac.length ? `${intPart.toString()}.${frac}` : intPart.toString();
      }
      break;
    }
    if (!wethPerFbc) return null;

    // Multiply decimals as numbers; convert to string
    const toNum = (s: string) => {
      const n = Number(s);
      return isFinite(n) ? n : 0;
    };
    const out = toNum(usdPerWeth) * toNum(wethPerFbc);
    if (!isFinite(out) || out <= 0) return null;
    return String(out);
  } catch (e) {
    console.error('Uniswap v3 TWAP price error:', e);
    return null;
  }
}

// ---------------------------
// Uniswap v4 (event-based TWAP)
// ---------------------------
// Minimal Swap event ABI for decoding sqrtPriceX96
const UNISWAP_V4_SWAP_EVENT = {
  name: 'Swap',
  type: 'event',
  inputs: [
    { name: 'id', type: 'bytes32', indexed: true },
    { name: 'sender', type: 'address', indexed: false },
    { name: 'recipient', type: 'address', indexed: false },
    { name: 'amount0', type: 'int256', indexed: false },
    { name: 'amount1', type: 'int256', indexed: false },
    { name: 'sqrtPriceX96', type: 'uint160', indexed: false },
    { name: 'tick', type: 'int24', indexed: false },
  ],
} as const;

function price1Per0FromSqrt(token0: `0x${string}`, token1: `0x${string}`, sqrtPriceX96: bigint, dec0: number, dec1: number): string {
  const ratioX192 = sqrtPriceX96 * sqrtPriceX96;
  const q192 = 2n ** 192n;
  // price1Per0 = (sqrt^2 / 2^192) * 10^(dec1 - dec0)
  return divToDecimalString(ratioX192 * pow10(dec1), q192 * pow10(dec0), 12);
}

async function usdPerWethFromV3Twap(seconds = TWAP_SECONDS): Promise<string | null> {
  const usdc = USDC_BASES[0];
  for (const fee of V3_FEE_TIERS) {
    const pool = await getPoolAddress(usdc, WETH_BASE, fee);
    if (!pool) continue;
    const avgTick = await observeAvgTick(pool, seconds);
    if (avgTick === null) continue;
    const [t0, t1] = sortTokens(usdc, WETH_BASE);
    const [dec0, dec1] = await Promise.all([ getTokenDecimals(t0), getTokenDecimals(t1) ]);
    const p = price1Per0FromTick(avgTick, dec0, dec1); // token1 per token0
    if (t0.toLowerCase() === WETH_BASE.toLowerCase()) {
      // t0=WETH, p = USD/WETH already
      return p;
    }
    // t0=USDC -> p = WETH/USDC; invert to USD/WETH
    const [i, f = ''] = p.split('.');
    const scaled = BigInt(i + (f + '000000000000').slice(0, 12));
    const invScaled = (10n ** 12n * 10n ** 12n) / scaled;
    const intPart = invScaled / (10n ** 12n);
    const frac = (invScaled % (10n ** 12n)).toString().padStart(12, '0').replace(/0+$/, '');
    return frac.length ? `${intPart.toString()}.${frac}` : intPart.toString();
  }
  return null;
}

// Optional lookback override for v4 TWAP (in blocks)
const V4_TWAP_LOOKBACK_BLOCKS: number = (() => {
  const raw = Number(process.env.NEXT_PUBLIC_V4_TWAP_LOOKBACK_BLOCKS || '');
  if (!isFinite(raw) || raw <= 0) return 20000; // sensible default window on Base
  return Math.min(Math.max(Math.floor(raw), 500), 200000);
})();

async function fetchWethPerFbcFromV4PoolId(poolId: `0x${string}`): Promise<string | null> {
  try {
    const latest = (await publicClient.getBlock()).number!;
    const approxBlocks = BigInt(V4_TWAP_LOOKBACK_BLOCKS);
    const fromBlock = latest > approxBlocks ? latest - approxBlocks : 0n;
    const logs = await publicClient.getLogs({
      address: UNISWAP_V4_POOL_MANAGER,
      event: UNISWAP_V4_SWAP_EVENT as any,
      args: { id: poolId },
      fromBlock,
      toBlock: latest,
    });
    if (!logs.length) return null;

    const fbc = CONTRACT_ADDRESSES.fbc;
    const [t0, t1] = sortTokens(fbc, WETH_BASE);
    const [dec0, dec1] = await Promise.all([ getTokenDecimals(t0), getTokenDecimals(t1) ]);

    const last = logs.slice(-10);
    let sumScaled = 0n;
    let count = 0n;
    for (const ev of last) {
      const sqrt = (ev as any)?.args?.sqrtPriceX96 as bigint | undefined;
      if (!sqrt || sqrt === 0n) continue;
      const p = price1Per0FromSqrt(t0, t1, sqrt, dec0, dec1);
      const [i, f = ''] = p.split('.');
      const scaled = BigInt(i + (f + '000000000000').slice(0, 12));
      sumScaled += scaled;
      count += 1n;
    }
    if (count === 0n) return null;
    const avgScaled = sumScaled / count; // token1 per token0

    let outScaled: bigint;
    if (t0.toLowerCase() === fbc.toLowerCase()) {
      // token0=FBC, token1=WETH → WETH/FBC
      outScaled = avgScaled;
    } else {
      // token0=WETH, token1=FBC → invert to WETH/FBC
      outScaled = (10n ** 12n * 10n ** 12n) / avgScaled;
    }
    const intPart = outScaled / (10n ** 12n);
    const frac = (outScaled % (10n ** 12n)).toString().padStart(12, '0').replace(/0+$/, '');
    return frac.length ? `${intPart.toString()}.${frac}` : intPart.toString();
  } catch (e) {
    console.error('Uniswap v4 fetch error:', e);
    return null;
  }
}

async function fetchFromUniswapV4Twap(): Promise<string | null> {
  if (!UNISWAP_V4_FBC_WETH_POOL_ID) return null;
  const wethPerFbc = await fetchWethPerFbcFromV4PoolId(UNISWAP_V4_FBC_WETH_POOL_ID);
  if (!wethPerFbc) return null;
  const usdPerWeth = await usdPerWethFromV3Twap();
  if (!usdPerWeth) return null;
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
 * Fetch FBC price from GeckoTerminal (fallback)
 * Supports either full pool id (e.g., base_uniswap_v4_0x...) or raw 0x... (bytes32) with implicit v4 prefix.
 */
async function fetchFromGeckoTerminal(): Promise<string | null> {
  try {
    if (!GECKO_POOL_ID_RAW) return null;
    const fbcAddr = CONTRACT_ADDRESSES.fbc.toLowerCase();
    // Extract 0x... key (pool address/id) from env (accepts raw 0x.. or strings containing it)
    const m = GECKO_POOL_ID_RAW.match(/0x[a-fA-F0-9]{40,64}/);
    const key = m ? m[0] : null;
    if (!key) return null;

    const url = `https://api.geckoterminal.com/api/v2/networks/base/pools/${key}`;
    const res = await fetch(url, {
      headers: {
        'accept': 'application/json',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    if (!res.ok) return null;
    const data: any = await res.json().catch(() => null);
    const attrs = data?.data?.attributes;
    const rel = data?.data?.relationships;
    const baseTokenId: string | undefined = rel?.base_token?.data?.id; // e.g. "base_0xcb6e9..."
    const quoteTokenId: string | undefined = rel?.quote_token?.data?.id; // e.g. "base_0x4200..."
    const endsWithAddr = (id: string | undefined, addr: string) => !!id && id.toLowerCase().endsWith(addr.toLowerCase());
    const baseIsFbc = endsWithAddr(baseTokenId, fbcAddr);
    const quoteIsFbc = endsWithAddr(quoteTokenId, fbcAddr);

    const pickNumeric = (v: any): number | null => {
      const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v.replace(/[^0-9.\-eE]/g, '')) : NaN;
      return isFinite(n) && n > 0 ? n : null;
    };

    // Prefer direct USD price if available
    if (baseIsFbc) {
      const usd = pickNumeric(attrs?.base_token_price_usd);
      if (usd) return String(usd);
    }
    if (quoteIsFbc) {
      const usd = pickNumeric(attrs?.quote_token_price_usd);
      if (usd) return String(usd);
    }

    // Compute via WETH leg if possible (fields may be masked by provider; attempt best-effort)
    const wethAddr = WETH_BASE.toLowerCase();
    const baseIsWeth = endsWithAddr(baseTokenId, wethAddr);
    const quoteIsWeth = endsWithAddr(quoteTokenId, wethAddr);
    if ((baseIsWeth || quoteIsWeth) && (baseIsFbc || quoteIsFbc)) {
      const usdPerWeth = await usdPerWethFromV3Twap();
      const nUsdPerWeth = pickNumeric(usdPerWeth);
      if (nUsdPerWeth) {
        let wethPerFbc: number | null = null;
        if (baseIsFbc) {
          wethPerFbc = pickNumeric(attrs?.quote_token_price_base_token);
        } else if (quoteIsFbc) {
          wethPerFbc = pickNumeric(attrs?.base_token_price_quote_token);
        }
        if (wethPerFbc && wethPerFbc > 0) {
          const usdPerFbc = nUsdPerWeth * wethPerFbc;
          if (isFinite(usdPerFbc) && usdPerFbc > 0) return String(usdPerFbc);
        }
      }
    }
    return null;
  } catch (error) {
    console.error('GeckoTerminal fetch error:', error);
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

  // If manual override provided, use it first (helps local/dev when token isn’t actively traded)
  const override = (() => {
    if (!PRICE_OVERRIDE_ENV) return null;
    const v = parseFloat(String(PRICE_OVERRIDE_ENV));
    return !isNaN(v) && v > 0 ? String(v) : null;
  })();
  if (override) {
    cachedPrice = { priceUsd: override, source: 'override', timestamp: Date.now() };
    return cachedPrice;
  }

  // Prefer: GeckoTerminal → Uniswap v4 TWAP → Uniswap v3 TWAP → 0x → Dexscreener → Custom
  let priceUsd: string | null = null;
  let source: 'dexscreener' | 'gecko' | 'custom' | '0x' | 'uniswap_v3' | 'uniswap_v4' | 'override' = 'dexscreener';

  // GeckoTerminal (try first - has actual FBC pool data)
  priceUsd = await fetchFromGeckoTerminal();
  if (priceUsd) source = 'gecko';

  // Uniswap v4 TWAP (if PoolId configured)
  if (!priceUsd) {
    priceUsd = await fetchFromUniswapV4Twap();
    if (priceUsd) source = 'uniswap_v4';
  }

  // Uniswap v3 TWAP (direct or multi-hop)
  if (!priceUsd) {
    priceUsd = await fetchFromUniswapV3Twap();
    if (priceUsd) source = 'uniswap_v3';
  }

  // 0x/Matcha (Base)
  if (!priceUsd) {
    priceUsd = await fetchFrom0x();
    if (priceUsd) source = '0x';
  }

  // Dexscreener
  if (!priceUsd) {
    priceUsd = await fetchFromDexscreener();
    if (priceUsd) source = 'dexscreener';
  }

  // Uniswap v3 on-chain instantaneous (if TWAP unavailable)
  if (!priceUsd) {
    priceUsd = await fetchFromUniswapV3Onchain();
    if (priceUsd) source = 'uniswap_v3';
  }

  // Custom URL (least reliable since it may be arbitrary/HTML)
  if (!priceUsd && CUSTOM_PRICE_URL) {
    priceUsd = await fetchFromCustom();
    if (priceUsd) source = 'custom';
  }

  if (!priceUsd) {
    // Final safeguard: use configured starter pack price to avoid 500s
    const starter = process.env.NEXT_PUBLIC_STARTER_PACK_PRICE_USD;
    const v = starter ? parseFloat(String(starter)) : NaN;
    if (!isNaN(v) && v > 0) {
      priceUsd = String(v);
      source = 'override';
    } else {
      throw new Error('Unable to fetch FBC price from any source');
    }
  }

  // Validate price
  const price = parseFloat(priceUsd);
  if (isNaN(price) || price <= 0) {
    throw new Error('Invalid price data received');
  }

  // In development, optionally assume 1 FBC = $1 to avoid misleading quotes
  if (process.env.NODE_ENV !== 'production' && ASSUME_ONE_USD) {
    priceUsd = '1';
    source = 'override';
  }

  // Debug log for diagnostics
  try { console.debug('[pricing] source=%s priceUsd=%s', source, priceUsd); } catch {}

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
  // Robust BigInt decimal math to avoid rounding to zero on tiny prices
  const toScaled = (s: string, scale: number): bigint => {
    const [i, f = ''] = String(s).trim().split('.');
    const ii = (i || '0').replace(/[^0-9]/g, '');
    const ff = f.replace(/[^0-9]/g, '');
    const frac = (ff + '0'.repeat(scale)).slice(0, scale);
    try { return BigInt(ii + frac); } catch { return 0n; }
  };

  const usdScaled18 = toScaled(usdAmount, 18);     // usd * 1e18
  const priceScaled18 = toScaled(priceUsd, 18);    // price * 1e18
  if (usdScaled18 <= 0n || priceScaled18 <= 0n) {
    throw new Error('Invalid USD or price value');
  }
  // amountWei = (usd * 1e18) / price
  // Using scaled ints: (usdScaled18 * 1e18) / priceScaled18
  const amountWei = (usdScaled18 * (10n ** 18n)) / priceScaled18;
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
