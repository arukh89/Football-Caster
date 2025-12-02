"use client";

import * as React from "react";
import { Gift, ArrowRight, Loader2, CheckCircle } from "lucide-react";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { quickAuth } from "@farcaster/miniapp-sdk";
import { useWallet } from "@/hooks/useWallet";
import { payInFBC } from "@/lib/wallet-utils";
import { formatFBC } from "@/lib/utils";
import { CONTRACT_ADDRESSES } from "@/lib/constants";
import { createWalletClient, http, createPublicClient } from "viem";
import { base } from "viem/chains";

interface QuoteResponse {
  amountWei: string;
  priceUsd: number | string;
  expiresAt?: number;
}

export function StarterPackCard(): JSX.Element | null {
  const [loading, setLoading] = React.useState(true);
  const [processing, setProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [hasClaimed, setHasClaimed] = React.useState<boolean | null>(null);
  const [quote, setQuote] = React.useState<QuoteResponse | null>(null);
  const [step, setStep] = React.useState<'idle' | 'quote' | 'payment' | 'verifying' | 'complete'>('idle');
  
  const { wallet, walletClient, publicClient: walletPublicClient, connect } = useWallet();
  const account = wallet.address;

  const refreshStatus = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await quickAuth.fetch("/api/starter/status", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { hasClaimed: boolean };
      setHasClaimed(!!data.hasClaimed);
    } catch (e) {
      setError("Failed to load starter pack status");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const handleGetQuote = async (): Promise<void> => {
    try {
      setProcessing(true);
      setError(null);
      setStep('quote');
      
      const res = await quickAuth.fetch("/api/starter/quote", { 
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to get quote");
      }
      
      const quoteData = (await res.json()) as QuoteResponse;
      setQuote(quoteData);
      setStep('payment');
    } catch (e) {
      setError((e as Error).message);
      setStep('idle');
    } finally {
      setProcessing(false);
    }
  };

  const handlePayAndVerify = async (): Promise<void> => {
    if (!quote || !account) return;
    
    try {
      setProcessing(true);
      setError(null);
      
      if (!wallet.isConnected) {
        await connect();
        return;
      }

      // Use existing wallet client if available
      if (!walletClient) {
        setError('Wallet client not available. Please connect your wallet.');
        return;
      }
      
      // Pay to treasury
      const { hash } = await payInFBC(
        walletClient as any, 
        walletPublicClient as any, 
        CONTRACT_ADDRESSES.treasury, 
        quote.amountWei
      );
      
      setStep('verifying');
      
      // Verify payment and grant pack
      const res = await quickAuth.fetch("/api/starter/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash: hash }),
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Verification failed");
      }
      
      setStep('complete');
      await refreshStatus();
    } catch (e) {
      setError((e as Error).message);
      setStep('payment');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return null;

  return (
    <GlassCard className="mb-6 p-4 border-emerald-500/30">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-xl bg-emerald-500/15 flex items-center justify-center">
          {step === 'complete' ? (
            <CheckCircle className="h-6 w-6 text-emerald-600" />
          ) : (
            <Gift className="h-6 w-6 text-emerald-600" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-lg">
              {hasClaimed ? "Starter Pack Claimed" : "Claim Starter Pack"}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {hasClaimed 
              ? "You've already claimed your 18 starter players." 
              : "One-time reward: get 18 tradable players to kickstart your squad."
            }
          </p>
          
          {error && <div className="text-sm text-red-500 mb-2">{error}</div>}
          
          {quote?.amountWei && step === 'payment' && (
            <div className="mb-3 p-2 bg-gray-100 dark:bg-gray-800 rounded">
              <div className="text-sm">Price: {formatFBC(quote.amountWei)}</div>
              <div className="text-xs text-muted-foreground">(~${quote.priceUsd} USD)</div>
            </div>
          )}

          {!hasClaimed && (
            <div className="flex gap-2">
              {step === 'idle' && (
                <Button 
                  onClick={handleGetQuote} 
                  disabled={processing} 
                  className="gap-2 championship-button"
                >
                  Get Price Quote
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
              
              {step === 'quote' && (
                <Button disabled className="gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Getting quote...
                </Button>
              )}
              
              {step === 'payment' && (
                <Button 
                  onClick={handlePayAndVerify}
                  disabled={processing || !quote?.amountWei}
                  className="gap-2 championship-button"
                >
                  {!wallet.isConnected ? "Connect Wallet" : "Pay & Claim"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
              
              {step === 'verifying' && (
                <Button disabled className="gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying payment...
                </Button>
              )}
              
              {step === 'complete' && (
                <Button disabled className="gap-2" variant="outline">
                  <CheckCircle className="h-4 w-4" />
                  Claimed Successfully!
                </Button>
              )}
            </div>
          )}
          
          {hasClaimed && (
            <Button disabled className="gap-2" variant="outline">
              <CheckCircle className="h-4 w-4" />
              Already Claimed
            </Button>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

export default StarterPackCard;
