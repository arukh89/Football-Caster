'use client';

import { useAccount, useConnect, useDisconnect, useSwitchChain, useWalletClient, usePublicClient } from 'wagmi';
import { base } from 'wagmi/chains';
import type { WalletState } from '@/lib/types';
import type { WalletClient, PublicClient } from 'viem';
import { CHAIN_CONFIG } from '@/lib/constants';
import { useIsInFarcaster } from '@/hooks/useIsInFarcaster';

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
  const isInFarcaster = useIsInFarcaster();

  const wallet: WalletState = {
    address,
    isConnected,
    chainId,
  };

  const isCorrectChain = chainId === CHAIN_CONFIG.chainId;

  const connect = (): void => {
    // Prefer Farcaster connector inside Mini App env, otherwise prefer injected (MetaMask/OKX)
    const pick = () => {
      const byId = (id: string) => connectors.find((c: any) => c?.id === id || c?.type === id);
      if (isInFarcaster) {
        return (
          connectors.find((c: any) => (c.id?.toString() || '').includes('farcaster') || (c.name || '').toLowerCase().includes('farcaster')) ||
          byId('farcaster') ||
          connectors[0]
        );
      }
      // Web: detect injected availability (MetaMask/OKX/Coinbase etc.)
      const w: any = typeof window !== 'undefined' ? window : {};
      const hasInjected = !!(w.ethereum || w.okxwallet || (w.ethereum?.providers && w.ethereum.providers.length));
      return (
        (hasInjected && (byId('injected') || connectors.find((c: any) => (c.name || '').toLowerCase().includes('injected') || (c.name || '').toLowerCase().includes('metamask')))) ||
        byId('injected') ||
        connectors[0]
      );
    };
    const connector = pick();
    if (connector) wagmiConnect({ connector });
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
