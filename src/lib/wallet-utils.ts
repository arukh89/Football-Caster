import type { WalletClient, PublicClient } from 'viem';
import { parseUnits, formatUnits } from 'viem';
import { readContract, waitForTransactionReceipt } from 'viem/actions';
import { base } from 'viem/chains';
import { CONTRACT_ADDRESSES } from './constants';

// ERC20 ABI for approve and transfer functions
const ERC20_ABI = [
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
    const [account] = await walletClient.getAddresses();
    if (!account) {
      throw new Error('No account connected');
    }

    const amountBigInt = BigInt(amount);

    // Direct ERC-20 transfer (no approval needed for simple sends)
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESSES.fbc,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [to, amountBigInt],
      account,
      chain: base,
    });

    await waitForTransactionReceipt(publicClient, { hash });

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
