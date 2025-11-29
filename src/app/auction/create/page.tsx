'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Gavel, UserSearch, DollarSign, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GlassCard } from '@/components/glass/GlassCard';
import { PlayerCard } from '@/components/PlayerCard';
import { DesktopNav, Navigation } from '@/components/Navigation';
import { useFarcasterIdentity } from '@/hooks/useFarcasterIdentity';
// Snapshots removed
import { parseFBC } from '@/lib/wallet-utils';
import type { Player } from '@/lib/types';

export default function CreateAuctionPage(): JSX.Element {
  const router = useRouter();
  const { identity } = useFarcasterIdentity();
  const fid = useMemo(() => identity?.fid ?? 250704, [identity]);

  const [myPlayers, setMyPlayers] = useState<Player[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [reserve, setReserve] = useState<string>('1');
  const [buyNow, setBuyNow] = useState<string>('');
  const [duration, setDuration] = useState<string>('48');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load my players from realtime API
  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const res = await fetch(`/api/players/mine?fid=${fid}`, { cache: 'no-store' });
        const data = await res.json();
        const mine = (data.players || []) as Player[];
      setMyPlayers(mine);
      if (!selectedId && mine.length > 0) setSelectedId(mine[0].playerId);
      } catch {}
    };
    void load();
  }, [fid]);

  const selectedPlayer = myPlayers.find((p) => p.playerId === selectedId) || null;

  const handleSubmit = async (): Promise<void> => {
    try {
      setSubmitting(true);
      setError(null);

      if (!selectedId) throw new Error('Select a player');
      const reserveWei = parseFBC(reserve || '1');
      const buyNowWei = buyNow ? parseFBC(buyNow) : undefined;
      const durationH = parseInt(duration || '48', 10);

      const res = await fetch('/api/auctions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: selectedId, reserveWei, durationH, buyNowWei }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create auction');
      }

      router.push('/auction');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <DesktopNav />
      <div className="min-h-screen mobile-safe md:pt-20 pb-20 md:pb-8">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Gavel className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">Create Auction</h1>
                <p className="text-sm text-muted-foreground">Create an auction from your live squad</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard>
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-semibold mb-1 flex items-center gap-2">
                    <UserSearch className="h-4 w-4" /> Select Player
                  </div>
                  <Select value={selectedId} onValueChange={setSelectedId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose player" />
                    </SelectTrigger>
                    <SelectContent>
                      {myPlayers.map((p) => (
                        <SelectItem key={p.playerId} value={p.playerId}>
                          {p.name} · {p.position} · {p.rating}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="text-xs font-semibold mb-1 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" /> Reserve (FBC)
                  </div>
                  <Input value={reserve} onChange={(e) => setReserve(e.target.value)} placeholder="1" />
                </div>

                <div>
                  <div className="text-xs font-semibold mb-1">Buy Now (FBC, optional)</div>
                  <Input value={buyNow} onChange={(e) => setBuyNow(e.target.value)} placeholder="" />
                </div>

                <div>
                  <div className="text-xs font-semibold mb-1 flex items-center gap-2">
                    <Timer className="h-4 w-4" /> Duration (hours)
                  </div>
                  <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="48" />
                </div>

                {error && (
                  <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
                )}

                <div className="flex gap-2">
                  <Button onClick={handleSubmit} disabled={submitting || !selectedId} className="championship-button">
                    {submitting ? 'Creating...' : 'Create Auction'}
                  </Button>
                  <Button variant="outline" onClick={() => router.push('/auction')}>Cancel</Button>
                </div>
              </div>
            </GlassCard>

            <div>
              {selectedPlayer ? (
                <GlassCard>
                  <PlayerCard player={selectedPlayer} />
                </GlassCard>
              ) : (
                <GlassCard className="text-sm text-muted-foreground">
                  Select a player to preview
                </GlassCard>
              )}
            </div>
          </div>
        </div>
      </div>
      <Navigation />
    </>
  );
}
