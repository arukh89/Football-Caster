'use client';

import { useAccount, useConnect, useDisconnect, useSwitchChain, useWalletClient, usePublicClient } from 'wagmi';
import { base } from 'wagmi/chains';
import type { WalletState } from '@/lib/types';
import type { WalletClient, PublicClient } from 'viem';
import { CHAIN_CONFIG } from '@/lib/constants';
import { useIsInFarcaster } from './useIsInFarcaster';

/**
 * Hook for wallet connection and management
 * Supports Base mainnet and Warpcast Warplet
 */
export function useWallet(): {
  wallet: WalletState;
  walletClient: WalletClient | undefined;
  publicClient: PublicClient;
  connect: () => Promise<void>;
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

  const connect = async (): Promise<void> => {
    // Prefer Farcaster connector inside Mini App, otherwise Injected
    const farcaster = connectors.find((c) => /farcaster/i.test(c.name));
    const injected = connectors.find((c) => /injected/i.test(c.id) || /injected/i.test(c.name));

    const tryConnect = async (connectorName: string | undefined, connector: typeof connectors[number] | undefined) => {
      if (!connector) throw new Error(`${connectorName || 'Connector'} unavailable`);
      await new Promise<void>((resolve, reject) => {
        wagmiConnect({ 
          connector, 
          chainId: CHAIN_CONFIG.chainId,
          // On success, ensure Base
          onSuccess: async () => {
            try {
              if (chainId !== CHAIN_CONFIG.chainId) {
                await switchChainAsync({ chainId: CHAIN_CONFIG.chainId });
              }
              resolve();
            } catch (e: unknown) {
              reject(e);
            }
          },
          onError: (e: unknown) => reject(e),
        } as any);
      });
    };

    try {
      if (isInFarcaster && farcaster) {
        await tryConnect('Farcaster', farcaster);
        return;
      }
      // Not in Mini App: try injected first
      if (injected) {
        await tryConnect('Injected', injected);
        return;
      }
      // Fallback to any available connector
      if (connectors[0]) {
        await tryConnect(connectors[0].name, connectors[0]);
      }
    } catch (err) {
      console.error('Primary connect failed, attempting fallback:', err);
      // Retry with alternate connector
      try {
        const alt = isInFarcaster ? injected : farcaster;
        if (alt) {
          await tryConnect(alt.name, alt);
        } else if (connectors[1]) {
          await tryConnect(connectors[1].name, connectors[1]);
        }
      } catch (err2) {
        console.error('Fallback connect failed:', err2);
        throw err2;
      }
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
