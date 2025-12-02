import { connect, getAccount, switchChain } from 'wagmi/actions';
import { wagmiConfig } from '@/lib/wagmi-config';

export class NotMiniAppError extends Error {
  constructor() {
    super('Not running inside Warpcast Mini App');
  }
}

export async function ensureWarpcastAndBase(): Promise<void> {
  // Detect Mini App by attempting to get provider from SDK
  let isMiniApp = false;
  try {
    const { default: sdk } = await import('@farcaster/miniapp-sdk');
    const provider = await sdk.wallet.getEthereumProvider();
    isMiniApp = !!provider;
  } catch {
    // noop
  }

  // Ensure connected
  const account = getAccount(wagmiConfig);
  if (!account.isConnected) {
    if (isMiniApp) {
      const farcaster = wagmiConfig.connectors.find(
        (c) => c.id?.toLowerCase().includes('farcaster') || c.name?.toLowerCase().includes('farcaster')
      );
      if (!farcaster) throw new Error('Farcaster connector missing');
      await connect(wagmiConfig, { connector: farcaster });
    } else {
      throw new NotMiniAppError();
    }
  }

  // Force Base chain (8453)
  const acc2 = getAccount(wagmiConfig);
  if (acc2.chainId !== 8453) {
    await switchChain(wagmiConfig, { chainId: 8453 });
  }
}

export async function assertUsingWarplet(): Promise<void> {
  const { connector } = getAccount(wagmiConfig);
  const name = connector?.name?.toLowerCase() ?? '';
  if (!name.includes('farcaster')) {
    try {
      const provider: any = await connector?.getProvider?.();
      const supportsRequest = !!provider?.request;
      if (!supportsRequest) throw new Error('Provider does not expose request');
    } catch {
      throw new Error('Not using Warplet / Farcaster connector');
    }
  }
}
