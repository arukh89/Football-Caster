import { createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import { CHAIN_CONFIG } from './constants';


export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    injected(),
  ],
  transports: {
    [base.id]: http(CHAIN_CONFIG.rpcUrl),
  },
});
