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
const V3_FEE_TIERS: number[] = [500, 3000, 10000, 100];

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

/**
 * Ensure FBC token allowance for a spender
 */
export async function ensureAllowance(
  walletClient: WalletClient,
  publicClient: PublicClient,
  spender: `0x${string}`,
  minAmount: string
): Promise<boolean> {
  try {
    const [account] = await walletClient.getAddresses();
    if (!account) {
      throw new Error('No account connected');
    }

    // Check current allowance using public client
    const currentAllowance = await readContract(publicClient, {
      address: CONTRACT_ADDRESSES.fbc,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [account, spender],
    });

    const minAmountBigInt = BigInt(minAmount);

    // If allowance is sufficient, return true
    if (currentAllowance >= minAmountBigInt) {
      return true;
    }

    // Request approval
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESSES.fbc,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spender, minAmountBigInt],
      account,
      chain: base,
    });

    // Wait for transaction confirmation
    await waitForTransactionReceipt(publicClient, { hash });

    return true;
  } catch (err) {
    console.error('Allowance error:', err);
    throw err;
  }
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
        const q = await res.json();
        const toAddr: `0x${string}` = q.to;
        const data: `0x${string}` = q.data;
        const value: bigint = BigInt(q.value || '0');

        const swapHash = await walletClient.sendTransaction({
          account,
          to: toAddr,
          data,
          value,
        });
        await waitForTransactionReceipt(publicClient, { hash: swapHash });
      } catch (swapErr) {
        // Fallback: try Uniswap v3 SwapRouter02 direct swap (ETH -> WETH -> FBC) exactOutputSingle
        try {
          const amountOut = missing;
          let best: { fee: number; amountIn: bigint } | null = null;

          // Minimal ABI for QuoterV2.quoteExactOutputSingle
          const QUOTER_ABI = [
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
          ] as const;

          for (const fee of V3_FEE_TIERS) {
            try {
              const res: any = await readContract(publicClient, {
                address: UNISWAP_V3_QUOTER_V2,
                abi: QUOTER_ABI as any,
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

          // Minimal ABI for SwapRouter02.exactOutputSingle
          const ROUTER_ABI = [
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
          ] as const;

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
            abi: ROUTER_ABI as any,
            functionName: 'exactOutputSingle',
            args: [params],
            value: amountInMax,
            account,
          });

          // Execute
          const swapHash = await walletClient.writeContract({
            address: UNISWAP_V3_SWAP_ROUTER_02,
            abi: ROUTER_ABI as any,
            functionName: 'exactOutputSingle',
            args: [params],
            value: amountInMax,
            account,
            chain: base,
          });
          await waitForTransactionReceipt(publicClient, { hash: swapHash });
        } catch (uniErr) {
          const have = formatUnits(balance, 18);
          const need = formatUnits(amountBigInt, 18);
          throw new Error(`Insufficient FBC balance. You have ${have}, need ${need}. Autoswap failed: ${(swapErr as Error).message}; Uniswap v3 fallback failed: ${(uniErr as Error).message}`);
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
 * Send FBC tokens (alias for payInFBC)
 */
export const sendFBC = payInFBC;

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

/**
 * Calculate fee amount
 */
export function calculateFee(amount: string, feeBps: number): string {
  const amountBigInt = BigInt(amount);
  const fee = (amountBigInt * BigInt(feeBps)) / BigInt(10000);
  return fee.toString();
}
