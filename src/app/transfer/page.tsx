'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, Search, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GlassCard } from '@/components/glass/GlassCard';
import { PriceTag } from '@/components/glass/PriceTag';
import { Navigation, DesktopNav } from '@/components/Navigation';
import { useFarcasterIdentity } from '@/hooks/useFarcasterIdentity';
import type { Listing } from '@/lib/types';

export default function TransfersPage(): JSX.Element {
  const { identity } = useFarcasterIdentity();
  const [listings, setListings] = useState<Listing[]>([]);

  // Load realtime listings
  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const res = await fetch('/api/market/listings', { cache: 'no-store' });
        const data = await res.json();
        setListings((data.listings || []) as Listing[]);
      } catch {}
    };
    void load();
  }, []);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('trending');

  const filteredListings = useMemo(() => {
    return listings.filter((l) => {
      if (identity && l.sellerFid === identity.fid) return false;
      if (searchQuery && !(l.playerId || '').toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [listings, identity, searchQuery]);

  const trending = useMemo(() => {
    // Sort by priceWei (descending) as a simple proxy for trending
    return [...filteredListings].sort((a, b) => {
      const aWei = BigInt(a.priceWei || '0');
      const bWei = BigInt(b.priceWei || '0');
      return bWei > aWei ? 1 : bWei < aWei ? -1 : 0;
    }).slice(0, 5);
  }, [filteredListings]);

  return (
    <>
      <DesktopNav />
      <div className="min-h-screen mobile-safe md:pt-20 pb-20 md:pb-8">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center animate-glow">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold championship-title">Transfer Market</h1>
                <p className="text-sm text-muted-foreground">
                  Scout and sign top talent
                </p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="market" className="space-y-6">
            <TabsList className="glass championship-card">
              <TabsTrigger value="market">Market</TabsTrigger>
              <TabsTrigger value="trending">Trending</TabsTrigger>
            </TabsList>

            {/* Market Tab */}
            <TabsContent value="market" className="space-y-6">
              {/* Filters */}
              <GlassCard className="championship-card">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search players..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trending">Trending</SelectItem>
                      <SelectItem value="price-high">Price: High to Low</SelectItem>
                      <SelectItem value="price-low">Price: Low to High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </GlassCard>

              {/* Results: Listings */}
              {filteredListings.length === 0 ? (
                <GlassCard className="text-center py-12">
                  <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <div className="text-lg font-semibold mb-1">No listings found</div>
                  <div className="text-sm text-muted-foreground">Try adjusting your search</div>
                </GlassCard>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...filteredListings]
                    .sort((a, b) => {
                      if (sortBy === 'price-high' || sortBy === 'trending') {
                        return BigInt(b.priceWei) > BigInt(a.priceWei) ? 1 : -1;
                      } else if (sortBy === 'price-low') {
                        return BigInt(a.priceWei) > BigInt(b.priceWei) ? 1 : -1;
                      }
                      return 0;
                    })
                    .map((l) => (
                      <GlassCard key={l.id} hover className="p-0 overflow-hidden">
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-bold">Player {String(l.playerId).slice(0, 6)}...</div>
                            <div className="text-xs text-muted-foreground">Seller FID {l.sellerFid}</div>
                          </div>
                          <div className="border-t border-border pt-3 mt-3">
                            <PriceTag type="fixed" priceFbc={l.priceWei} className="text-xs" />
                            <div className="grid grid-cols-2 gap-2 mt-3">
                              <Link href={`/market/${l.id}`}>
                                <Button size="sm" className="w-full">View</Button>
                              </Link>
                              <Button size="sm" variant="outline" className="w-full" disabled>
                                Buy Now
                              </Button>
                            </div>
                          </div>
                        </div>
                      </GlassCard>
                    ))}
                </div>
              )}
            </TabsContent>

            {/* Trending Tab */}
            <TabsContent value="trending" className="space-y-6">
              <GlassCard className="championship-card">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-yellow-500" />
                  <h3 className="font-bold text-lg">Hot Right Now</h3>
                </div>
                <div className="space-y-4">
                  {trending.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No trending listings yet.</div>
                  ) : (
                    trending.map((l, index) => (
                      <div key={l.id} className="flex items-center gap-4 p-4 glass rounded-lg">
                        <div className="text-2xl font-bold text-emerald-500 w-8">#{index + 1}</div>
                        <div className="flex-1">
                          <div className="font-bold">Player {String(l.playerId).slice(0, 10)}</div>
                          <div className="text-xs text-muted-foreground">Seller FID {l.sellerFid}</div>
                        </div>
                        <PriceTag type="fixed" priceFbc={l.priceWei} className="text-xs" />
                        <Link href={`/market/${l.id}`}>
                          <Button size="sm" className="championship-button">View</Button>
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              </GlassCard>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Navigation />
    </>
  );
}
