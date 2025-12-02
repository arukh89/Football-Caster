import { getAccount } from 'wagmi/actions';
import { wagmiConfig } from '@/lib/wagmi-config';

type Call = { to: `0x${string}`; data: `0x${string}`; value?: `0x${string}` };

export async function tryBatchSend(calls: Array<Call>) {
  const { connector } = getAccount(wagmiConfig);
  const provider: any = await connector?.getProvider?.();
  if (!provider?.request) return null;

  try {
    const hash: `0x${string}` = await provider.request({
      method: 'wallet_sendCalls',
      params: [{ calls }],
    });
    return hash;
  } catch {
    return null;
  }
}
