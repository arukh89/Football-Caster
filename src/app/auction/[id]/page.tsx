/**
 * Dynamic auction detail page
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/glass/GlassCard';
import { AuctionTimer } from '@/components/glass/AuctionTimer';
import { PriceTag } from '@/components/glass/PriceTag';
import { useFarcasterIdentity } from '@/hooks/useFarcasterIdentity';
import { useWallet } from '@/hooks/useWallet';
import { API_ENDPOINTS } from '@/lib/constants';
import { payInFBC, formatFBC } from '@/lib/wallet-utils';
import { ChevronLeft, Gavel, ShoppingCart, Plus } from 'lucide-react';
import { createConfig } from 'wagmi';
import { wagmiConfig } from '@/lib/wagmi-config';
import { createWalletClient, http, createPublicClient } from 'viem';
import { base } from 'viem/chains';
import { useSpacetimeLive } from '@/providers/SpacetimeLiveProvider';

interface AuctionDetail {
  id: string;
  sellerFid: number;
  playerId: string;
  startingFbcWei: string;
  currentFbcWei: string;
  currentBidderFid: number | null;
  endsAt: number;
  buyNowFbcWei?: string;
  antiSnipeUsed: boolean;
  antiSnipeExtendsBy: number;
  bidIncrementFbc: string;
  isClosed: boolean;
  sellerWallet?: string;
}

export default function AuctionDetailPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  
  const [auction, setAuction] = useState<AuctionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bidding, setBidding] = useState(false);
  const [buying, setBuying] = useState(false);

  const { identity } = useFarcasterIdentity();
  const { version } = useSpacetimeLive();
  const { wallet, walletClient, publicClient: walletPublicClient, connect } = useWallet();
  const account = wallet.address;

  const fetchAuction = async (): Promise<void> => {
    try {
      setLoading(true);
      const res = await fetch(`${API_ENDPOINTS.auction.info}`.replace('[id]', id as string));
      if (!res.ok) throw new Error('Failed to fetch auction');
      const data = await res.json();
      setAuction(data.auction);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load auction');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) void fetchAuction();
  }, [id]);

  useEffect(() => {
    if (id) void fetchAuction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, id]);

  const handlePlaceBid = async (): Promise<void> => {
    if (!auction || !identity) return;
    
    try {
      setBidding(true);
      setError(null);

      const res = await fetch(API_ENDPOINTS.auction.bid, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auctionId: auction.id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place bid');

      await fetchAuction();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place bid');
    } finally {
      setBidding(false);
    }
  };

  const handleBuyNow = async (): Promise<void> => {
    if (!auction || !auction.buyNowFbcWei || !account) return;

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

      const sellerWallet = auction.sellerWallet as `0x${string}`;
      const amountWei = auction.buyNowFbcWei;

      // Pay in FBC
      const { hash } = await payInFBC(walletClient as any, walletPublicClient as any, sellerWallet, amountWei);

      // Verify and execute buy-now
      const res = await fetch(API_ENDPOINTS.auction.buyNow, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auctionId: auction.id, txHash: hash }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Buy-now failed');

      await fetchAuction();
      router.push('/auction');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Buy-now failed');
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

  if (error || !auction) {
    return (
      <div className="container mx-auto p-4">
        <Button onClick={() => router.push('/auction')} variant="ghost">
          <ChevronLeft className="mr-2" /> Back to Auctions
        </Button>
        <div className="mt-4 p-4 bg-red-100 rounded">
          {error || 'Auction not found'}
        </div>
      </div>
    );
  }

  const isMyAuction = auction.sellerFid === identity?.fid;
  const isMyBid = auction.currentBidderFid === identity?.fid;
  const canBid = !isMyAuction && !auction.isClosed;
  const canBuyNow = !isMyAuction && !auction.isClosed && auction.buyNowFbcWei;

  return (
    <div className="container mx-auto p-4">
      <Button onClick={() => router.push('/auction')} variant="ghost" className="mb-4">
        <ChevronLeft className="mr-2" /> Back to Auctions
      </Button>

      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Auction #{auction.id}</h1>
          {auction.isClosed && (
            <div className="px-3 py-1 bg-red-500/20 text-red-500 rounded-full text-sm font-medium">
              Closed
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="font-semibold mb-2">Player Details</h2>
            <div className="space-y-2 text-sm">
              <div>Player ID: {auction.playerId}</div>
              <div>Seller FID: {auction.sellerFid}</div>
            </div>
          </div>

          <div>
            <h2 className="font-semibold mb-2">Auction Status</h2>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground">Current Bid</div>
                <PriceTag type="bid" priceFbcWei={auction.currentFbcWei} />
                {auction.currentBidderFid && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Bidder FID: {auction.currentBidderFid}
                    {isMyBid && ' (You)'}
                  </div>
                )}
              </div>

              {auction.buyNowFbcWei && (
                <div>
                  <div className="text-sm text-muted-foreground">Buy Now Price</div>
                  <PriceTag type="fixed" priceFbcWei={auction.buyNowFbcWei} />
                </div>
              )}

              <div>
                <div className="text-sm text-muted-foreground">Time Remaining</div>
                <AuctionTimer endsAt={auction.endsAt.toString()} />
              </div>

              {auction.antiSnipeUsed && (
                <div className="text-xs text-warning">
                  ⚠️ Anti-snipe activated (+{auction.antiSnipeExtendsBy / 60} min)
                </div>
              )}
            </div>
          </div>
        </div>

        {!auction.isClosed && (
          <div className="mt-6 pt-6 border-t border-border flex gap-3">
            {canBid && (
              <Button 
                onClick={handlePlaceBid}
                disabled={bidding || buying}
                variant="default"
              >
                {bidding ? 'Placing Bid...' : (
                  <>
                    <Gavel className="mr-2 h-4 w-4" />
                    Place Bid ({formatFBC(auction.bidIncrementFbc)} FBC)
                  </>
                )}
              </Button>
            )}

            {canBuyNow && (
              <Button 
                onClick={handleBuyNow}
                disabled={buying || bidding}
                variant="default"
              >
                {buying ? 'Processing...' : (
                  <>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Buy Now
                  </>
                )}
              </Button>
            )}

            {isMyAuction && (
              <div className="text-sm text-muted-foreground">
                This is your auction
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