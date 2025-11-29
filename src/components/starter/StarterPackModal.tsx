'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Gift, Wallet } from 'lucide-react';
import { DEV_FID } from '@/lib/constants';

interface StarterPackModalProps {
  open: boolean;
  onClose: () => void;
}

type Rarity = 'common' | 'rare' | 'epic';

function pickRarity(): Rarity {
  // 70% common, 15% rare, 15% epic (can be tuned)
  const r = Math.random();
  if (r < 0.7) return 'common';
  if (r < 0.85) return 'rare';
  return 'epic';
}

export function StarterPackModal({ open, onClose }: StarterPackModalProps): JSX.Element | null {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [amountWei, setAmountWei] = React.useState<string>('0');
  const [fbcAmount, setFbcAmount] = React.useState<string>('0');
  const USD = 1;

  React.useEffect(() => {
    if (!open) return;
    // Always quote for USD $1 in FBC
    void (async () => {
      try {
        setError(null);
        const res = await fetch('/api/starter/quote', { method: 'POST' });
        if (res.ok) {
          const data = await res.json() as { amountWei: string };
          setAmountWei(data.amountWei);
          // Convert wei to FBC with 18 decimals
          const fbc = Number(data.amountWei) / 1e18;
          setFbcAmount(fbc.toFixed(4));
        }
      } catch {
        // fallback: unknown amount, still fixed to USD $1
        setAmountWei('0');
        setFbcAmount('0');
      }
    })();
  }, [open]);

  const handleDevClaim = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      // Determine current FID from sessionStorage (dev), fallback to DEV_FID
      const fidStr = typeof window !== 'undefined' ? window.sessionStorage.getItem('farcaster_fid') : null;
      const fid = fidStr ? parseInt(fidStr, 10) : DEV_FID;
      // Local dev endpoint; fixed price: USD $1 → amountWei computed above
      const res = await fetch('/api/starter/claim', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid, amountWei }),
      });
      if (!res.ok) throw new Error('Claim failed');
      const data = await res.json();
      // Derive 18 squad with rarity distribution (70% common)
      const roster = (data.players as Array<{ name: string; position: string; rating: number }>);
      const need = 18 - roster.length;
      if (need > 0) {
        for (let i = 0; i < need; i++) {
          roster.push({ name: `Extra ${i+1}`, position: i < 7 ? 'SUB' : 'SUB', rating: 65 + Math.floor(Math.random()*10) });
        }
      }
      const enriched = roster.slice(0, 18).map((p) => ({ ...p, rarity: pickRarity() }));
      // Persist flag to not show again automatically
      localStorage.setItem('starterPackSeen', '1');
      // Basic toast replacement
      alert(`Starter pack granted: ${enriched.length} players (USD $${USD.toFixed(2)}, ~${fbcAmount} FBC).`);
      onClose();
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 glass rounded-xl p-6 w-[92vw] max-w-md">
        <button onClick={onClose} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center">
            <Gift className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Starter Pack</h3>
            <p className="text-sm text-muted-foreground">Get 18 players (11 starters + 7 subs). Rarity: 70% Common.</p>
          </div>
        </div>
        <div className="mb-4">
          <Badge variant="outline" className="mr-2">Price</Badge>
          <span className="font-semibold">$1</span>
          <span className="text-sm text-muted-foreground ml-1">(charged in FBC ≈ {fbcAmount} FBC)</span>
        </div>
        {error && <div className="text-sm text-red-500 mb-2">{error}</div>}
        <div className="flex gap-3">
          <Button onClick={handleDevClaim} disabled={loading} className="gap-2 championship-button">
            <Wallet className="h-4 w-4" />
            {loading ? 'Processing...' : 'Buy ($1 in FBC) - Dev'}
          </Button>
          <Button variant="outline" onClick={() => { localStorage.setItem('starterPackSeen', '1'); onClose(); }}>
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}

export default StarterPackModal;
