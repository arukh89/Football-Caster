import { simulateContract, writeContract, waitForTransactionReceipt } from 'wagmi/actions';
import type { Abi } from 'viem';
import { wagmiConfig } from '@/lib/wagmi-config';

type SendTxParams = {
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args?: any[];
  value?: bigint;
  confirmations?: number; // default 2
};

export async function sendTx<T extends SendTxParams>(p: T) {
  const { request } = await simulateContract(wagmiConfig, {
    address: p.address,
    abi: p.abi,
    functionName: p.functionName as any,
    args: (p.args ?? []) as any[],
    value: p.value,
  });

  const hash = await writeContract(wagmiConfig, request);

  const receipt = await waitForTransactionReceipt(wagmiConfig, {
    hash,
    confirmations: p.confirmations ?? 2,
  });

  return { hash, receipt };
}
