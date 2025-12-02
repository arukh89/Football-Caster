import { createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector';
import { CHAIN_CONFIG } from './constants';


export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    // Prefer Farcaster Mini App connector in Mini App env; fallback to injected
    miniAppConnector(),
    injected(),
  ],
  transports: {
    [base.id]: http(CHAIN_CONFIG.rpcUrl),
  },
});
