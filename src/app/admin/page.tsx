"use client";

import { useState, useMemo } from 'react';
import { GlassCard } from '@/components/glass/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { quickAuth } from '@farcaster/miniapp-sdk';
import { useIsInFarcaster } from '@/hooks/useIsInFarcaster';
import { useFarcasterIdentity } from '@/hooks/useFarcasterIdentity';
import { CONTRACT_ADDRESSES, DEV_FID } from '@/lib/constants';

export default function AdminPage(): JSX.Element {
  const isInFarcaster = useIsInFarcaster();
  const fetcher = (input: RequestInfo | URL, init?: RequestInit) =>
    isInFarcaster ? (quickAuth.fetch as any)(input as any, init as any) : fetch(input, init);

  const { identity } = useFarcasterIdentity();
  const [me, setMe] = useState<{ fid: number; wallet: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [targetFid, setTargetFid] = useState('');
  const [targetWallet, setTargetWallet] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useState(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetcher('/api/auth/me');
        if (!res.ok) throw new Error('Unauthorized');
        const data = await res.json();
        setMe({ fid: Number(data.fid), wallet: String(data.wallet || '').toLowerCase() });
      } catch (e) {
        setError('Unauthorized');
      } finally {
        setLoading(false);
      }
    })();
  });

  const isAdmin = useMemo(() => {
    if (!me) return false;
    return me.fid === DEV_FID || me.wallet === CONTRACT_ADDRESSES.treasury.toLowerCase();
  }, [me]);

  const onGrant = async (): Promise<void> => {
    setError(null);
    setResult(null);
    try {
      setSubmitting(true);
      const fidNum = parseInt(targetFid || '0', 10);
      if (!Number.isFinite(fidNum) || fidNum <= 0) throw new Error('Invalid FID');
      const body: any = { fid: fidNum };
      if (targetWallet.trim()) body.wallet = targetWallet.trim();
      const res = await fetcher('/api/admin/starter/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to grant');
      setResult(`Granted to FID ${data.fid}. Players: ${data.playersGranted}`);
      setTargetFid('');
      setTargetWallet('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="container mx-auto p-4">Loading...</div>;
  if (!isAdmin) return (
    <div className="container mx-auto p-4">
      <GlassCard className="p-4">
        <div className="font-bold mb-2">Admin</div>
        <div className="text-sm text-muted-foreground">Forbidden</div>
      </GlassCard>
    </div>
  );

  return (
    <div className="container mx-auto p-4 max-w-xl">
      <GlassCard className="p-4">
        <div className="font-bold text-lg mb-4">Grant Starter Pack (Admin)</div>

        <div className="space-y-3">
          <div className="grid gap-1">
            <Label htmlFor="fid">Target FID</Label>
            <Input id="fid" placeholder="e.g. 123456" value={targetFid} onChange={(e) => setTargetFid(e.target.value)} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="wallet">Target Wallet (optional)</Label>
            <Input id="wallet" placeholder="0x... (optional)" value={targetWallet} onChange={(e) => setTargetWallet(e.target.value)} />
          </div>
          {error && <div className="text-sm text-red-500">{error}</div>}
          {result && <div className="text-sm text-green-600">{result}</div>}
          <div className="pt-2">
            <Button onClick={onGrant} disabled={submitting} className="championship-button">
              {submitting ? 'Granting...' : 'Grant Starter Pack'}
            </Button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
