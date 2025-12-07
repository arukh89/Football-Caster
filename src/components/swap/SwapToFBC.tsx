"use client";

import React from "react";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWallet } from "@/hooks/useWallet";
import { CONTRACT_ADDRESSES } from "@/lib/constants";
import { formatUnits, parseUnits, type WalletClient } from "viem";
import { waitForTransactionReceipt } from "viem/actions";
import { base } from "viem/chains";
import { Loader2, ArrowRight, Repeat } from "lucide-react";

// Minimal ERC20 ABI for allowance/approve
const ERC20_ABI = [
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [ { name: 'owner', type: 'address' }, { name: 'spender', type: 'address' } ], outputs: [ { name: '', type: 'uint256' } ] },
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [ { name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' } ], outputs: [ { name: '', type: 'bool' } ] },
] as const;

type TokenOption = {
  id: 'ETH' | 'USDC';
  label: string;
  address?: `0x${string}`; // undefined for ETH
  decimals: number;
};

const TOKENS: TokenOption[] = [
  { id: 'ETH', label: 'ETH (Base)', decimals: 18 },
  { id: 'USDC', label: 'USDC (Base)', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
];

type Quote = {
  to: `0x${string}`;
  data: `0x${string}`;
  value?: string;
  buyAmount: string;
  sellAmount: string;
  allowanceTarget?: `0x${string}`;
  price?: string;
};

export function SwapToFBC(): JSX.Element {
  const { wallet, walletClient, publicClient, connect, isCorrectChain, switchToBase } = useWallet();

  const [sellToken, setSellToken] = React.useState<TokenOption>(TOKENS[0]);
  const [buyAmountFbc, setBuyAmountFbc] = React.useState<string>('1');
  const [sellAmount, setSellAmount] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);
  const [quote, setQuote] = React.useState<Quote | null>(null);
  const [estBuyFbcWei, setEstBuyFbcWei] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [txHash, setTxHash] = React.useState<`0x${string}` | null>(null);

  const useSellAmount = !!sellAmount && Number(sellAmount) > 0;
  const canSwap = !!wallet.address && !!walletClient && (useSellAmount || (!!buyAmountFbc && Number(buyAmountFbc) > 0));

  const getQuote = React.useCallback(async () => {
    if (!wallet.address) { setError('Connect wallet first'); return; }
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        buyToken: CONTRACT_ADDRESSES.fbc,
        takerAddress: wallet.address,
        slippagePercentage: '0.02',
        skipValidation: 'true',
      });
      if (useSellAmount) {
        const sellAmountWei = parseUnits(sellAmount, sellToken.decimals).toString();
        params.set('sellAmount', sellAmountWei);
      } else {
        const buyAmountWei = parseUnits(buyAmountFbc || '0', 18).toString();
        params.set('buyAmount', buyAmountWei);
      }
      if (sellToken.id === 'ETH') params.set('sellToken', 'ETH');
      else params.set('sellToken', sellToken.address!);

      const res = await fetch(`/api/zeroex/quote?${params.toString()}`, { cache: 'no-store' });
      if (res.ok) {
        const q = await res.json();
        setQuote(q as Quote);
        setEstBuyFbcWei(null);
      } else {
        // Fallback estimation when 0x cannot quote this pair (e.g., custom token not supported yet)
        // Estimate via USD bridges: USDC=$1; ETH via 0x USDC→ETH price; then divide by FBC USD price
        const fbcPriceRes = await fetch('/api/pricing/fbc-usd', { cache: 'no-store' });
        const fbcJson = await fbcPriceRes.json().catch(() => ({} as any));
        const priceUsd = Number(fbcJson?.priceUsd || '1');
        if (!isFinite(priceUsd) || priceUsd <= 0) throw new Error('Pricing unavailable');
        let usdAmount = 0;
        if (useSellAmount) {
          if (sellToken.id === 'USDC') {
            usdAmount = Number(sellAmount);
          } else {
            // get USDC→ETH price for 1 USD to derive USD/ETH
            const p = new URLSearchParams({ sellToken: 'USDC', buyToken: 'ETH', sellAmount: '1000000' });
            const r = await fetch(`/api/zeroex/quote?${p.toString()}`, { cache: 'no-store' });
            if (r.ok) {
              const jj = await r.json();
              const ethPerUsd = Number(formatUnits(BigInt(jj.buyAmount as string), 18));
              const eth = Number(sellAmount);
              usdAmount = eth / (ethPerUsd || 1);
            }
          }
          const fbcFloat = usdAmount / priceUsd;
          const wei = parseUnits(String(fbcFloat || 0), 18).toString();
          setEstBuyFbcWei(wei);
          setQuote(null);
        } else {
          // Given target FBC amount, estimate sell side in USD and show
          const fbc = Number(buyAmountFbc || '0');
          const usd = fbc * priceUsd;
          const wei = parseUnits(String(fbc || 0), 18).toString();
          setEstBuyFbcWei(wei);
          setQuote(null);
        }
      }
    } catch (e) {
      setQuote(null);
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [wallet.address, buyAmountFbc, sellAmount, sellToken.id, sellToken.address, sellToken.decimals, useSellAmount]);

  // Auto-quote on input changes (debounced)
  React.useEffect(() => {
    if (!wallet.address) return;
    if (!(useSellAmount || (buyAmountFbc && Number(buyAmountFbc) > 0))) return;
    const t = setTimeout(() => { void getQuote(); }, 400);
    return () => clearTimeout(t);
  }, [wallet.address, useSellAmount, sellAmount, buyAmountFbc, sellToken.id, getQuote]);

  const ensureAllowance = async (client: WalletClient, amount: bigint, owner: `0x${string}`, spender: `0x${string}`): Promise<void> => {
    if (!sellToken.address) return; // ETH doesn't need allowance
    try {
      const current = await publicClient.readContract({
        address: sellToken.address,
        abi: ERC20_ABI as any,
        functionName: 'allowance',
        args: [owner, spender],
      }) as bigint;
      if (current >= amount) return;
      const max = 2n ** 256n - 1n;
      const hash = await client.writeContract({
        address: sellToken.address,
        abi: ERC20_ABI as any,
        functionName: 'approve',
        args: [spender, max],
        chain: base,
        account: owner,
      });
      await waitForTransactionReceipt(publicClient, { hash });
    } catch (err) {
      throw new Error('Approval failed');
    }
  };

  const doSwap = async (): Promise<void> => {
    if (!wallet.address) return connect();
    if (!walletClient) return connect();
    if (!isCorrectChain) await switchToBase();
    if (!quote) { await getQuote(); if (!quote) return; }
    try {
      setLoading(true);
      setError(null);

      // Approve if selling ERC20
      if (sellToken.address && quote.allowanceTarget) {
        const sellAmount = BigInt(quote.sellAmount);
        await ensureAllowance(walletClient, sellAmount, wallet.address, quote.allowanceTarget);
      }

      const hash = await walletClient.sendTransaction({
        account: wallet.address,
        to: quote.to,
        data: quote.data,
        value: quote.value ? BigInt(quote.value) : 0n,
        chain: base,
      });
      await waitForTransactionReceipt(publicClient, { hash });
      setTxHash(hash);
      // fire-and-forget analytics sink
      void fetch('/api/analytics_events', { method: 'POST', body: JSON.stringify({ type: 'swap_to_fbc', sellToken: sellToken.id, buyAmountFbc }) });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassCard className="mb-6 p-4 border-blue-500/30">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-xl bg-blue-500/15 flex items-center justify-center">
          <Repeat className="h-6 w-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-lg">Swap to FBC</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">Buy FBC using ETH or USDC on Base.</p>

          {error && <div className="text-sm text-red-500 mb-2">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div className="grid gap-1">
              <Label>Pay with</Label>
              <Select value={sellToken.id} onValueChange={(v) => { const t = TOKENS.find(t => t.id === v as any)!; setSellToken(t); setQuote(null); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TOKENS.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label>Amount to pay ({sellToken.id})</Label>
              <Input value={sellAmount} onChange={(e) => { setSellAmount(e.target.value); setQuote(null); }} placeholder={sellToken.id === 'ETH' ? '0.05' : '50'} />
            </div>
            <div className="grid gap-1">
              <Label>Or target FBC amount</Label>
              <Input value={buyAmountFbc} onChange={(e) => { setBuyAmountFbc(e.target.value); setQuote(null); }} placeholder="1.0" />
            </div>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <Button onClick={getQuote} variant="outline" disabled={loading || !wallet.address} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Get Quote
            </Button>
            <Button onClick={doSwap} disabled={loading || !canSwap || !quote} className="gap-2 championship-button">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Swap
            </Button>
          </div>

          {(quote || estBuyFbcWei) && (
            <div className="text-xs text-muted-foreground">
              {quote ? (
                useSellAmount
                  ? <>Est. you receive ~{formatUnits(BigInt(quote.buyAmount), 18)} FBC for {formatUnits(BigInt(quote.sellAmount), sellToken.decimals)} {sellToken.id}</>
                  : <>Est. you pay ~{formatUnits(BigInt(quote.sellAmount), sellToken.decimals)} {sellToken.id} for {formatUnits(BigInt(quote.buyAmount), 18)} FBC</>
              ) : (
                useSellAmount
                  ? <>Est. you receive ~{formatUnits(BigInt(estBuyFbcWei || '0'), 18)} FBC (estimation)</>
                  : <>Target ~{formatUnits(BigInt(estBuyFbcWei || '0'), 18)} FBC (estimation)</>
              )}
            </div>
          )}

          {txHash && (
            <div className="mt-2 text-xs">
              Success. Tx: <a className="underline" href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noreferrer">{txHash.slice(0, 10)}...</a>
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

export default SwapToFBC;
