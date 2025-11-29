'use client';

import { useAccount, useConnect, useDisconnect, useSwitchChain, useWalletClient, usePublicClient } from 'wagmi';
import { base } from 'wagmi/chains';
import type { WalletState } from '@/lib/types';
import type { WalletClient, PublicClient } from 'viem';
import { CHAIN_CONFIG } from '@/lib/constants';

/**
 * Hook for wallet connection and management
 * Supports Base mainnet and Warpcast Warplet
 */
export function useWallet(): {
  wallet: WalletState;
  walletClient: WalletClient | undefined;
  publicClient: PublicClient;
  connect: () => void;
  disconnect: () => void;
  switchToBase: () => Promise<void>;
  isCorrectChain: boolean;
} {
  const { address, isConnected, chainId } = useAccount();
  const { connect: wagmiConnect, connectors } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const wallet: WalletState = {
    address,
    isConnected,
    chainId,
  };

  const isCorrectChain = chainId === CHAIN_CONFIG.chainId;

  const connect = (): void => {
    // Use the first available connector (typically MetaMask or Warplet)
    const connector = connectors[0];
    if (connector) {
      wagmiConnect({ connector });
    }
  };

  const disconnect = (): void => {
    wagmiDisconnect();
  };

  const switchToBase = async (): Promise<void> => {
    try {
      await switchChainAsync({ chainId: base.id });
    } catch (err) {
      console.error('Failed to switch to Base:', err);
      throw err;
    }
  };

  return {
    wallet,
    walletClient,
    publicClient: publicClient!,
    connect,
    disconnect,
    switchToBase,
    isCorrectChain,
  };
}
