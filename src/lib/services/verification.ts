/**
 * Verification Service - On-chain FBC transfer verification
 */

import { createPublicClient, http, type Address, type Hash } from 'viem';
import { base } from 'viem/chains';
import { getFBCPrice, calculateFBCAmount } from './pricing';

const FBC_ADDRESS = (process.env.NEXT_PUBLIC_FBC_ADDRESS as Address) || '0xcb6e9f9bab4164eaa97c982dee2d2aaffdb9ab07';
const RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';

function normalizeAddress(addr: Address): Address {
  return addr.toLowerCase() as Address;
}

function requiredConfirmations(defaultValue: number): number {
  const raw = process.env.TX_CONFIRMATIONS;
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : defaultValue;
}

// ERC-20 Transfer event signature
const TRANSFER_EVENT_SIGNATURE = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

const publicClient = createPublicClient({
  chain: base,
  transport: http(RPC_URL),
});

interface TransferLog {
  from: Address;
  to: Address;
  value: bigint;
}

interface VerificationResult {
  valid: boolean;
  transfer?: TransferLog;
  blockNumber?: bigint;
  timestamp?: number;
  error?: string;
}

/**
 * Decode ERC-20 Transfer event
 */
function decodeTransferLog(log: { topics: readonly `0x${string}`[]; data: `0x${string}` }): TransferLog | null {
  try {
    if (log.topics.length !== 3) return null;

    const from = `0x${log.topics[1]?.slice(26)}` as Address;
    const to = `0x${log.topics[2]?.slice(26)}` as Address;
    const value = BigInt(log.data);

    return { from, to, value };
  } catch {
    return null;
  }
}

/**
 * Verify FBC transfer matches expected parameters
 */
export async function verifyFBCTransfer(
  txHash: Hash,
  expectedFrom: Address,
  expectedTo: Address,
  expectedUsdAmount: string,
  allowDevBypass = false
): Promise<VerificationResult> {
  try {
    // Get transaction receipt
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash });

    if (!receipt) {
      return { valid: false, error: 'Transaction not found' };
    }

    if (receipt.status !== 'success') {
      return { valid: false, error: 'Transaction failed' };
    }

    // Wait for confirmations (configurable, default 10)
    const currentBlock = await publicClient.getBlockNumber();
    const confirmations = currentBlock - receipt.blockNumber;
    const REQUIRED = BigInt(requiredConfirmations(10));
    if (confirmations < REQUIRED) {
      return { valid: false, error: `Insufficient confirmations: ${confirmations}/${REQUIRED}` };
    }

    // Find Transfer event for FBC token
    const transferLog = receipt.logs.find((log) => {
      return (
        normalizeAddress(log.address as Address) === normalizeAddress(FBC_ADDRESS) &&
        log.topics[0] === TRANSFER_EVENT_SIGNATURE
      );
    });

    if (!transferLog) {
      return { valid: false, error: 'No FBC transfer found in transaction' };
    }

    const transfer = decodeTransferLog(transferLog);
    if (!transfer) {
      return { valid: false, error: 'Failed to decode transfer log' };
    }

    // Verify from address
    if (normalizeAddress(transfer.from) !== normalizeAddress(expectedFrom)) {
      return {
        valid: false,
        error: `Sender mismatch: expected ${expectedFrom}, got ${transfer.from}`,
      };
    }

    // Verify to address
    if (normalizeAddress(transfer.to) !== normalizeAddress(expectedTo)) {
      return {
        valid: false,
        error: `Recipient mismatch: expected ${expectedTo}, got ${transfer.to}`,
      };
    }

    // Get block timestamp
    const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });
    const timestamp = Number(block.timestamp) * 1000;

    // Calculate expected amount at block time
    const priceData = await getFBCPrice();
    const expectedAmountWei = calculateFBCAmount(expectedUsdAmount, priceData.priceUsd);
    const expectedAmountBigInt = BigInt(expectedAmountWei);

    // Strict amount check (no tolerance)
    if (transfer.value !== expectedAmountBigInt) {
      // Allow small variance due to price volatility (±1%)
      const tolerance = expectedAmountBigInt / BigInt(100);
      const diff = transfer.value > expectedAmountBigInt 
        ? transfer.value - expectedAmountBigInt
        : expectedAmountBigInt - transfer.value;

      if (diff > tolerance) {
        return {
          valid: false,
          error: `Amount mismatch: expected ${expectedAmountWei}, got ${transfer.value.toString()}`,
        };
      }
    }

    return {
      valid: true,
      transfer,
      blockNumber: receipt.blockNumber,
      timestamp,
    };
  } catch (error) {
    console.error('Verification error:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

/**
 * Verify any FBC transfer (for marketplace/auctions)
 */
export async function verifyFBCTransferExact(
  txHash: Hash,
  expectedFrom: Address,
  expectedTo: Address,
  expectedAmountWei: string
): Promise<VerificationResult> {
  try {
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash });

    if (!receipt || receipt.status !== 'success') {
      return { valid: false, error: 'Transaction not found or failed' };
    }

    // Wait for confirmations (configurable, default 10)
    const currentBlock = await publicClient.getBlockNumber();
    const confirmations = currentBlock - receipt.blockNumber;
    const REQUIRED = BigInt(requiredConfirmations(10));
    if (confirmations < REQUIRED) {
      return { valid: false, error: `Insufficient confirmations: ${confirmations}/${REQUIRED}` };
    }

    const transferLog = receipt.logs.find((log) => {
      return (
        normalizeAddress(log.address as Address) === normalizeAddress(FBC_ADDRESS) &&
        log.topics[0] === TRANSFER_EVENT_SIGNATURE
      );
    });

    if (!transferLog) {
      return { valid: false, error: 'No FBC transfer found' };
    }

    const transfer = decodeTransferLog(transferLog);
    if (!transfer) {
      return { valid: false, error: 'Failed to decode transfer' };
    }

    // Verify exact match
    if (
      normalizeAddress(transfer.from) !== normalizeAddress(expectedFrom) ||
      normalizeAddress(transfer.to) !== normalizeAddress(expectedTo) ||
      transfer.value !== BigInt(expectedAmountWei)
    ) {
      return {
        valid: false,
        error: 'Transfer parameters do not match',
        transfer,
      };
    }

    const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });

    return {
      valid: true,
      transfer,
      blockNumber: receipt.blockNumber,
      timestamp: Number(block.timestamp) * 1000,
    };
  } catch (error) {
    console.error('Exact verification error:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}
