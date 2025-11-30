'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Gavel, Plus, Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GlassCard } from '@/components/glass/GlassCard';
import { PriceTag } from '@/components/glass/PriceTag';
import { AuctionTimer } from '@/components/glass/AuctionTimer';
import { Navigation, DesktopNav } from '@/components/Navigation';
// Snapshots removed
import { useFarcasterIdentity } from '@/hooks/useFarcasterIdentity';
import type { Auction } from '@/lib/types';
import { API_ENDPOINTS } from '@/lib/constants';
import { useWallet } from '@/hooks/useWallet';
import { payInFBC } from '@/lib/wallet-utils';

export default function AuctionPage(): React.JSX.Element {
  const { identity } = useFarcasterIdentity();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const { wallet, walletClient, publicClient, connect, isCorrectChain, switchToBase } = useWallet();
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Load auctions from realtime API
  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const res = await fetch('/api/auctions', { cache: 'no-store' });
        const data = await res.json();
        setAuctions((data.auctions || []) as Auction[]);
        setError(null);
      } catch (e) {
        console.error('Failed to load auctions', e);
        setError('Failed to load auctions');
      }
    };
    void load();
  }, []);
  
  const [activeTab, setActiveTab] = useState<string>('active');

  const activeAuctions = auctions?.filter((a) => a.status === 'active') || [];
  const myAuctions = activeAuctions.filter((a) => a.sellerFid === identity?.fid);
  const myBids = activeAuctions.filter((a) => a.currentBidderFid === identity?.fid);

  async function refresh(): Promise<void> {
    try {
      const res = await fetch('/api/auctions', { cache: 'no-store' });
      const data = await res.json();
      setAuctions((data.auctions || []) as Auction[]);
      setError(null);
    } catch (e) {
      console.error('Failed to refresh auctions', e);
      setError('Failed to refresh auctions');
    }
  }

  const handleBuyNow = async (auction: Auction): Promise<void> => {
    try {
      setError(null);
      setBuyingId(auction.id);
      
      if (!wallet.isConnected || !walletClient || !publicClient) {
        connect();
        throw new Error('Connect your wallet to continue');
      }

      if (!isCorrectChain) {
        await switchToBase();
      }

      // Fetch payment target
      const infoRes = await fetch(API_ENDPOINTS.auction.info(auction.id), { cache: 'no-store' });
      const info = await infoRes.json();
      if (!infoRes.ok) throw new Error(info.error || 'Failed to fetch buy-now info');

      const sellerWallet = info.sellerWallet as `0x${string}`;
      const amountWei = info.buyNowFbcWei as string;

      // Pay in FBC
      const { hash } = await payInFBC(walletClient, publicClient, sellerWallet, amountWei);

      // Verify and execute buy-now
      const bnRes = await fetch(API_ENDPOINTS.auction.buyNow, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auctionId: auction.id, txHash: hash }),
      });
      const bn = await bnRes.json();
      if (!bnRes.ok) throw new Error(bn.error || 'Buy-now failed');

      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Buy-now error');
    } finally {
      setBuyingId(null);
    }
  };

  const renderAuctionCard = (auction: Auction): React.JSX.Element => {

    const isMyAuction = auction.sellerFid === identity?.fid;
    const isMyBid = auction.currentBidderFid === identity?.fid;

    return (
      <GlassCard key={auction.id} hover className="p-0 overflow-hidden cursor-pointer">
        <Link href={`/auction/${auction.id}`}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-bold">Player {auction.playerId.slice(0, 6)}...</div>
              <div className="text-xs text-muted-foreground">Seller FID {auction.sellerFid}</div>
            </div>

            <div className="mt-4 pt-4 border-t border-border space-y-3">
              <div className="flex items-center justify-between">
                <AuctionTimer endsAt={auction.endsAt} compact />
                {auction.antiSnipeUsed && (
                  <div className="text-xs text-orange-600 dark:text-orange-400 font-semibold">
                    EXTENDED
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <PriceTag
                  type="auction"
                  priceFbcWei={auction.topBidFbcWei || '0'}
                  className="text-xs"
                />
                {auction.buyNowFbcWei && (
                  <div className="space-y-2">
                    <PriceTag type="fixed" priceFbcWei={auction.buyNowFbcWei} className="text-xs" />
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={(e) => { e.preventDefault(); void handleBuyNow(auction); }}
                      disabled={buyingId === auction.id}
                    >
                      <Zap className="h-4 w-4 mr-1" /> {buyingId === auction.id ? 'Processing...' : 'Buy Now'}
                    </Button>
                  </div>
                )}
              </div>

              {isMyAuction && (
                <div className="text-xs font-semibold text-green-600 dark:text-green-400">
                  Your Auction
                </div>
              )}
              {isMyBid && !isMyAuction && (
                <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  You're Winning!
                </div>
              )}

              <Button className="w-full" size="sm">
                View Details
              </Button>
            </div>
          </div>
        </Link>
      </GlassCard>
    );
  };

  return (
    <>
      <DesktopNav />
      <div className="min-h-screen mobile-safe md:pt-20 pb-20 md:pb-8">
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Gavel className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">Auctions</h1>
                <p className="text-sm text-muted-foreground">
                  Bid on players or create auctions
                </p>
              </div>
            </div>
            <Link href="/auction/create">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Auction
              </Button>
            </Link>
          </div>

          {/* Auction Info */}
          <GlassCard className="mb-6 border-purple-500/20">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <Gavel className="h-4 w-4 text-purple-600" />
              </div>
              <div className="text-sm">
                <div className="font-semibold mb-1">Auction Rules</div>
                <div className="text-muted-foreground space-y-1">
                  <div>• 48-hour duration with reserve price at Pt value</div>
                  <div>• Minimum 2% bid increment or 1 FBC (whichever is greater)</div>
                  <div>• Anti-snipe: bids in last 3 minutes extend by 3 minutes (once)</div>
                  <div>• Optional Buy Now price for instant purchase</div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="active">
                All Auctions ({activeAuctions.length})
              </TabsTrigger>
              <TabsTrigger value="my-auctions">
                My Auctions ({myAuctions.length})
              </TabsTrigger>
              <TabsTrigger value="my-bids">
                My Bids ({myBids.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              {activeAuctions.length === 0 ? (
                <GlassCard className="text-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <div className="text-lg font-semibold mb-1">No Active Auctions</div>
                  <div className="text-sm text-muted-foreground">
                    Check back later or create your own auction
                  </div>
                </GlassCard>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeAuctions.map(renderAuctionCard)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="my-auctions">
              {myAuctions.length === 0 ? (
                <GlassCard className="text-center py-12">
                  <Gavel className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <div className="text-lg font-semibold mb-1">No Auctions Created</div>
                  <div className="text-sm text-muted-foreground mb-4">
                    Create an auction to sell your players
                  </div>
                  <Link href="/auction/create">
                    <Button>Create Auction</Button>
                  </Link>
                </GlassCard>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myAuctions.map(renderAuctionCard)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="my-bids">
              {myBids.length === 0 ? (
                <GlassCard className="text-center py-12">
                  <Gavel className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <div className="text-lg font-semibold mb-1">No Active Bids</div>
                  <div className="text-sm text-muted-foreground">
                    Browse auctions and place bids on players you want
                  </div>
                </GlassCard>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myBids.map(renderAuctionCard)}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {error && (
            <div className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</div>
          )}
        </div>
      </div>
      <Navigation />
    </>
  );
}
