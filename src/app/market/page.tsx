'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingBag, Filter, Search, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GlassCard } from '@/components/glass/GlassCard';
import { PriceTag } from '@/components/glass/PriceTag';
import { Navigation, DesktopNav } from '@/components/Navigation';
// Snapshots removed
import { useFarcasterIdentity } from '@/hooks/useFarcasterIdentity';
// types unused here

export default function MarketPage(): JSX.Element {
  const { identity } = useFarcasterIdentity();
  const [listings, setListings] = useState<any[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Load listings from realtime API
  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const res = await fetch('/api/market/listings', { cache: 'no-store' });
        const data = await res.json();
        setListings((data.listings || []) as any[]);
        setLoadError(null);
      } catch (e) {
        console.error('Failed to load listings', e);
        setLoadError('Failed to load listings');
      }
    };
    void load();
  }, []);
  
  const [search, setSearch] = useState<string>('');
  const [positionFilter, setPositionFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('rating');

  const filteredListings = listings.filter((l) => {
    if (identity && l.sellerFid === identity.fid) return false;
    if (search && !(l.playerId || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <DesktopNav />
      <div className="min-h-screen mobile-safe md:pt-20 pb-20 md:pb-8">
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <ShoppingBag className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">Player Market</h1>
                <p className="text-sm text-muted-foreground">
                  Trade players at weekly market prices
                </p>
              </div>
            </div>
            <Link href="/market/list">
              <Button className="gap-2">
                <TrendingUp className="h-4 w-4" />
                List Player
              </Button>
            </Link>
          </div>

          {/* Filters */}
          <GlassCard className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search players..."
                    value={search}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={positionFilter} onValueChange={setPositionFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Positions</SelectItem>
                  <SelectItem value="GK">Goalkeeper</SelectItem>
                  <SelectItem value="DEF">Defender</SelectItem>
                  <SelectItem value="MID">Midfielder</SelectItem>
                  <SelectItem value="FWD">Forward</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Highest Rating</SelectItem>
                  <SelectItem value="price">Highest Price</SelectItem>
                  <SelectItem value="morale">Best Morale</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </GlassCard>

          {/* Market Info */}
          <GlassCard className="mb-6 border-blue-500/20">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-sm">
                <div className="font-semibold mb-1">How the Market Works</div>
                <div className="text-muted-foreground space-y-1">
                  <div>• Weekly prices (Pt) set by point value algorithm</div>
                  <div>• Bid/Ask spread for buy/sell prices</div>
                  <div>• 2% marketplace fee (dev accounts exempt)</div>
                  <div>• 7-day hold period before listing</div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Listings Grid */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Available Listings</h2>
              <div className="text-sm text-muted-foreground">
                {filteredListings.length} listings
              </div>
            </div>

            {loadError ? (
              <GlassCard className="text-center py-12">
                <div className="text-lg font-semibold mb-1">{loadError}</div>
                <div className="text-sm text-muted-foreground">Please try again.</div>
              </GlassCard>
            ) : filteredListings.length === 0 ? (
              <GlassCard className="text-center py-12">
                <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <div className="text-lg font-semibold mb-1">No listings found</div>
                <div className="text-sm text-muted-foreground">
                  Try adjusting your filters
                </div>
              </GlassCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredListings.map((l) => (
                  <GlassCard key={l.id} hover className="p-0 overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-bold">Player {String(l.playerId).slice(0, 6)}...</div>
                        <div className="text-xs text-muted-foreground">Seller FID {l.sellerFid}</div>
                      </div>

                      <div className="border-t border-border pt-3 mt-3">
                        <div className="grid grid-cols-1 gap-2">
                          <PriceTag type="fixed" priceFbcWei={l.priceFbcWei} className="text-xs" />
                        </div>

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
          </div>
        </div>
      </div>
      <Navigation />
    </>
  );
}
