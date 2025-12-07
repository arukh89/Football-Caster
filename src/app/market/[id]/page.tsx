/**
 * Dynamic market listing detail page
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/glass/GlassCard';
import { PriceTag } from '@/components/glass/PriceTag';
import { useFarcasterIdentity } from '@/hooks/useFarcasterIdentity';
import { useWallet } from '@/hooks/useWallet';
import { API_ENDPOINTS } from '@/lib/constants';
import { payInFBC } from '@/lib/wallet-utils';
import { formatFBC } from '@/lib/utils';
import { ChevronLeft, ShoppingCart } from 'lucide-react';
import { createWalletClient, http, createPublicClient } from 'viem';
import { base } from 'viem/chains';

interface MarketListing {
  id: string;
  sellerFid: number;
  playerId: string;
  priceFbcWei: string;
  isActive: boolean;
  createdAt: number;
  sellerWallet?: string;
  itemType?: 'player' | 'squad' | string;
}

export default function MarketDetailPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  
  const [listing, setListing] = useState<MarketListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);

  const { identity } = useFarcasterIdentity();
  const { wallet, walletClient, publicClient: walletPublicClient, connect } = useWallet();
  const account = wallet.address;

  const fetchListing = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      // For now, fetch all listings and find the one we want
      // In production, you'd have a dedicated endpoint for single listing
      const res = await fetch(API_ENDPOINTS.market.listings);
      if (!res.ok) throw new Error('Failed to fetch listings');
      const payload = await res.json();
      const data = payload?.data ?? payload;
      const found = data.listings?.find((l: MarketListing) => l.id === id);
      if (!found) throw new Error('Listing not found');
      setListing(found);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load listing');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      void fetchListing();
    }
  }, [id, fetchListing]);

  const handleBuyNow = async (): Promise<void> => {
    if (!listing || !account) return;

    try {
      setBuying(true);
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

      const sellerWallet = listing.sellerWallet as `0x${string}`;
      const amountWei = listing.priceFbcWei;

      // Pay in FBC
      const { hash } = await payInFBC(walletClient as any, walletPublicClient as any, sellerWallet, amountWei);

      // Verify and execute purchase
      const res = await fetch(API_ENDPOINTS.market.buy, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: listing.id, txHash: hash }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Purchase failed');

      router.push('/market');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Purchase failed');
    } finally {
      setBuying(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-4" />
          <div className="h-64 bg-gray-300 rounded mb-4" />
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="container mx-auto p-4">
        <Button onClick={() => router.push('/market')} variant="ghost">
          <ChevronLeft className="mr-2" /> Back to Market
        </Button>
        <div className="mt-4 p-4 bg-red-100 rounded">
          {error || 'Listing not found'}
        </div>
      </div>
    );
  }

  const isMyListing = listing.sellerFid === identity?.fid;
  const canBuy = !isMyListing && listing.isActive;

  return (
    <div className="container mx-auto p-4">
      <Button onClick={() => router.push('/market')} variant="ghost" className="mb-4">
        <ChevronLeft className="mr-2" /> Back to Market
      </Button>

      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Market Listing #{listing.id}</h1>
          {!listing.isActive && (
            <div className="px-3 py-1 bg-red-500/20 text-red-500 rounded-full text-sm font-medium">
              Sold
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="font-semibold mb-2">{listing.itemType === 'squad' ? 'Squad' : 'Player'} Details</h2>
            <div className="space-y-2 text-sm">
              <div>Item ID: {listing.playerId}</div>
              <div>Seller FID: {listing.sellerFid}</div>
              <div>Listed: {new Date(listing.createdAt * 1000).toLocaleDateString()}</div>
            </div>
          </div>

          <div>
            <h2 className="font-semibold mb-2">Price</h2>
            <PriceTag type="fixed" priceFbcWei={listing.priceFbcWei} />
          </div>
        </div>

        {listing.isActive && (
          <div className="mt-6 pt-6 border-t border-border">
            {canBuy ? (
              <Button 
                onClick={handleBuyNow}
                disabled={buying}
                variant="default"
                size="lg"
              >
                {buying ? 'Processing...' : (
                  <>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Buy Now
                  </>
                )}
              </Button>
            ) : isMyListing ? (
              <div className="text-sm text-muted-foreground">
                This is your listing
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Please connect your wallet to purchase
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
      </GlassCard>
    </div>
  );
}