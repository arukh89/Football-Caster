import type { WalletClient, PublicClient } from 'viem';
import { parseUnits, formatUnits } from 'viem';
import { readContract, waitForTransactionReceipt, simulateContract } from 'viem/actions';
import { base } from 'viem/chains';
import { CONTRACT_ADDRESSES } from './constants';
import { sendTx } from '@/lib/onchain/sendTx';
const OX_QUOTE_URL = '/api/zeroex/quote';
const WETH_BASE: `0x${string}` = '0x4200000000000000000000000000000000000006';
const UNISWAP_V3_QUOTER_V2: `0x${string}` = '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a';
const UNISWAP_V3_SWAP_ROUTER_02: `0x${string}` = '0x2626664c2603336E57B271c5C0b26F421741e481';
const V3_FEE_TIERS: number[] = [100, 500, 3000, 10000];
// USDC (official) with env-extensible list to avoid hardcoding unknowns
const USDC_DEFAULTS: `0x${string}`[] = [
  '0x833589fCD6edb6E08f4c7C76f99918fCae4f2dE0',
];
const USDC_ENV = (process.env.NEXT_PUBLIC_USDC_ADDRESSES || '')
  .split(',')
  .map((s) => s.trim())
  .filter((s) => /^0x[a-fA-F0-9]{40}$/.test(s)) as `0x${string}`[];
const USDC_BASES: `0x${string}`[] = Array.from(new Set([...USDC_DEFAULTS, ...USDC_ENV]));

// ERC20 ABI for approve and transfer functions
const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// QuoterV2 ABI (single and multi-hop)
const QUOTER_V2_ABI = [
  {
    name: 'quoteExactOutputSingle',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{
      components: [
        { name: 'tokenIn', type: 'address' },
        { name: 'tokenOut', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'fee', type: 'uint24' },
        { name: 'sqrtPriceLimitX96', type: 'uint160' },
      ],
      name: 'params',
      type: 'tuple'
    }],
    outputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'sqrtPriceX96After', type: 'uint160' },
      { name: 'initializedTicksCrossed', type: 'uint32' },
      { name: 'gasEstimate', type: 'uint256' },
    ],
  },
  {
    name: 'quoteExactOutput',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'path', type: 'bytes' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'sqrtPriceX96AfterList', type: 'uint160[]' },
      { name: 'initializedTicksCrossedList', type: 'uint32[]' },
      { name: 'gasEstimate', type: 'uint256' },
    ],
  },
] as const;

// SwapRouter02 ABI (single and multi-hop)
const ROUTER_V2_ABI = [
  {
    name: 'exactOutputSingle',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{
      components: [
        { name: 'tokenIn', type: 'address' },
        { name: 'tokenOut', type: 'address' },
        { name: 'fee', type: 'uint24' },
        { name: 'recipient', type: 'address' },
        { name: 'deadline', type: 'uint256' },
        { name: 'amountOut', type: 'uint256' },
        { name: 'amountInMaximum', type: 'uint256' },
        { name: 'sqrtPriceLimitX96', type: 'uint160' },
      ],
      name: 'params',
      type: 'tuple'
    }],
    outputs: [ { name: 'amountIn', type: 'uint256' } ],
  },
  {
    name: 'exactOutput',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{
      components: [
        { name: 'path', type: 'bytes' },
        { name: 'recipient', type: 'address' },
        { name: 'deadline', type: 'uint256' },
        { name: 'amountOut', type: 'uint256' },
        { name: 'amountInMaximum', type: 'uint256' },
      ],
      name: 'params',
      type: 'tuple'
    }],
    outputs: [ { name: 'amountIn', type: 'uint256' } ],
  },
] as const;

function strip0x(h: string): string { return h.startsWith('0x') ? h.slice(2) : h; }
function addrToBytes20(addr: `0x${string}`): string { return strip0x(addr.toLowerCase()); }
function feeTo3BytesHex(fee: number): string {
  const hex = fee.toString(16).padStart(6, '0');
  return hex;
}
// For exactOutput, path is encoded from tokenOut -> ... -> tokenIn with 3-byte fee between tokens
function encodeV3PathExactOutput(tokens: `0x${string}`[], fees: number[]): `0x${string}` {
  // tokens length = fees length + 1
  let hex = '';
  for (let i = 0; i < tokens.length; i++) {
    hex += addrToBytes20(tokens[i]);
    if (i < fees.length) hex += feeTo3BytesHex(fees[i]);
  }
  return ('0x' + hex) as `0x${string}`;
}


/**
 * Pay in FBC tokens
 * Optionally batches approve + transfer if EIP-5792 is supported
 */
export async function payInFBC(
  walletClient: WalletClient,
  publicClient: PublicClient,
  to: `0x${string}`,
  amount: string,
): Promise<{ hash: `0x${string}`; success: boolean }> {
  try {
    const amountBigInt = BigInt(amount);
    const [account] = await walletClient.getAddresses();
    if (!account) throw new Error('No account connected');

    // Pre-check balance to surface friendly error before simulate/write
    const balance = await readContract(publicClient, {
      address: CONTRACT_ADDRESSES.fbc,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [account],
    });
    if (balance < amountBigInt) {
      // Attempt auto-swap from ETH → FBC for the missing amount via 0x on Base
      const missing = amountBigInt - balance;
      try {
        const url = `${OX_QUOTE_URL}?sellToken=ETH&buyToken=${CONTRACT_ADDRESSES.fbc}&buyAmount=${missing}&takerAddress=${account}&slippagePercentage=0.02&includedSources=Uniswap_V3&skipValidation=true`;
        const res = await fetch(url, { headers: { accept: 'application/json' } });
        if (!res.ok) throw new Error(`0x quote failed (${res.status})`);
        const payload = await res.json();
        const q = payload?.data ?? payload;
        const toAddr: `0x${string}` = q.to;
        const data: `0x${string}` = q.data;
        const value: bigint = BigInt(q.value || '0');

        const swapHash = await walletClient.sendTransaction({
          account,
          to: toAddr,
          data,
          value,
          chain: base,
        });
        await waitForTransactionReceipt(publicClient, { hash: swapHash });
      } catch (swapErr) {
        // Fallback A: try Uniswap v3 SwapRouter02 direct swap (ETH -> WETH -> FBC) exactOutputSingle
        try {
          const amountOut = missing;
          let best: { fee: number; amountIn: bigint } | null = null;

          for (const fee of V3_FEE_TIERS) {
            try {
              const res: any = await readContract(publicClient, {
                address: UNISWAP_V3_QUOTER_V2,
                abi: QUOTER_V2_ABI as any,
                functionName: 'quoteExactOutputSingle',
                args: [{ tokenIn: WETH_BASE, tokenOut: CONTRACT_ADDRESSES.fbc, amount: amountOut, fee, sqrtPriceLimitX96: 0n }],
              });
              const amountIn = BigInt(res?.[0] ?? res?.amountIn ?? '0');
              if (amountIn > 0n && (!best || amountIn < best.amountIn)) {
                best = { fee, amountIn };
              }
            } catch {}
          }

          if (!best) throw new Error('No viable Uniswap v3 pool for WETH→FBC');

          const amountInMax = (best.amountIn * 102n) / 100n; // +2% slippage
          const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);

          const params = {
            tokenIn: WETH_BASE,
            tokenOut: CONTRACT_ADDRESSES.fbc,
            fee: best.fee,
            recipient: account,
            deadline,
            amountOut,
            amountInMaximum: amountInMax,
            sqrtPriceLimitX96: 0n,
          } as const;

          // Simulate first
          await simulateContract(publicClient, {
            address: UNISWAP_V3_SWAP_ROUTER_02,
            abi: ROUTER_V2_ABI as any,
            functionName: 'exactOutputSingle',
            args: [params],
            value: amountInMax,
            account,
          });

          // Execute
          const swapHash = await walletClient.writeContract({
            address: UNISWAP_V3_SWAP_ROUTER_02,
            abi: ROUTER_V2_ABI as any,
            functionName: 'exactOutputSingle',
            args: [params],
            value: amountInMax,
            account,
            chain: base,
          });
          await waitForTransactionReceipt(publicClient, { hash: swapHash });
        } catch (uniErrSingle) {
          // Fallback B: Multi-hop ETH -> USDC -> FBC
          try {
            const amountOut = missing;
            let best: { fees: [number, number]; amountIn: bigint; usdc: `0x${string}` } | null = null;
            for (const usdc of USDC_BASES) {
              for (const fee01 of V3_FEE_TIERS) { // FBC<-WETH (last hop fee)
                for (const fee12 of V3_FEE_TIERS) { // WETH<-USDC (first hop fee)
                  try {
                    // Path for exactOutput: tokenOut -> ... -> tokenIn
                    const path = encodeV3PathExactOutput(
                      [CONTRACT_ADDRESSES.fbc, WETH_BASE, usdc],
                      [fee01, fee12]
                    );
                    const res: any = await readContract(publicClient, {
                      address: UNISWAP_V3_QUOTER_V2,
                      abi: QUOTER_V2_ABI as any,
                      functionName: 'quoteExactOutput',
                      args: [path, amountOut],
                    });
                    const amountIn = BigInt(res?.[0] ?? res?.amountIn ?? '0');
                    if (amountIn > 0n && (!best || amountIn < best.amountIn)) {
                      best = { fees: [fee01, fee12], amountIn, usdc };
                    }
                  } catch {}
                }
              }
              if (best) break;
            }
            if (!best) throw new Error('No viable Uniswap v3 multi-hop path USDC→WETH→FBC');

            const amountInMax = (best!.amountIn * 102n) / 100n; // +2% slippage
            const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
            const path = encodeV3PathExactOutput(
              [CONTRACT_ADDRESSES.fbc, WETH_BASE, best!.usdc],
              best!.fees
            );
            const params = {
              path,
              recipient: account,
              deadline,
              amountOut,
              amountInMaximum: amountInMax,
            } as const;

            // Simulate
            await simulateContract(publicClient, {
              address: UNISWAP_V3_SWAP_ROUTER_02,
              abi: ROUTER_V2_ABI as any,
              functionName: 'exactOutput',
              args: [params],
              value: amountInMax,
              account,
            });

            // Execute
            const swapHash = await walletClient.writeContract({
              address: UNISWAP_V3_SWAP_ROUTER_02,
              abi: ROUTER_V2_ABI as any,
              functionName: 'exactOutput',
              args: [params],
              value: amountInMax,
              account,
              chain: base,
            });
            await waitForTransactionReceipt(publicClient, { hash: swapHash });
          } catch (uniErrMulti) {
            const have = formatUnits(balance, 18);
            const need = formatUnits(amountBigInt, 18);
            throw new Error(`Insufficient FBC balance. You have ${have}, need ${need}. Autoswap failed: ${(swapErr as Error).message}; Uniswap v3 single-hop failed: ${(uniErrSingle as Error).message}; multi-hop failed: ${(uniErrMulti as Error).message}`);
          }
        }
        const have = formatUnits(balance, 18);
        const need = formatUnits(amountBigInt, 18);
        // If we reached here, Uniswap swap succeeded; continue
      }

      // Re-check balance after swap
      const newBal = await readContract(publicClient, {
        address: CONTRACT_ADDRESSES.fbc,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [account],
      });
      if (newBal < amountBigInt) {
        const have = formatUnits(newBal, 18);
        const need = formatUnits(amountBigInt, 18);
        throw new Error(`Swap did not acquire enough FBC. You have ${have}, need ${need}.`);
      }
    }

    // Standardized: simulate → write → wait via wagmi actions
    const { hash } = await sendTx({
      address: CONTRACT_ADDRESSES.fbc,
      abi: ERC20_ABI as any,
      functionName: 'transfer',
      args: [to, amountBigInt],
      confirmations: 2,
    });

    return { hash, success: true };
  } catch (err) {
    console.error('Payment error:', err);
    throw err;
  }
}


/**
 * Format FBC amount from wei to readable format
 */
export function formatFBC(amountWei: string | bigint): string {
  return formatUnits(BigInt(amountWei), 18);
}

/**
 * Parse FBC amount from readable format to wei
 */
export function parseFBC(amount: string): string {
  return parseUnits(amount, 18).toString();
}

// (calculateFee, ensureAllowance removed as unused)
