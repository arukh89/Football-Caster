"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Trophy, RefreshCcw } from 'lucide-react';
import { GlassCard } from '@/components/glass/GlassCard';
import { Button } from '@/components/ui/button';

type LeaderRow = { fid: number; points: number; w: number; d: number; l: number };

export default function LeaderboardClient(): JSX.Element {
  const sp = useSearchParams();
  const seasonId = sp.get('seasonId') || '2025-S1';
  const fromMs = sp.get('fromMs') || undefined;
  const toMs = sp.get('toMs') || undefined;

  const [rows, setRows] = useState<LeaderRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (fromMs) p.set('fromMs', fromMs);
    if (toMs) p.set('toMs', toMs);
    p.set('seasonId', seasonId);
    return p.toString();
  }, [fromMs, toMs, seasonId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/season/leaderboard?${qs}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { leaderboard: LeaderRow[] };
      setRows(data.leaderboard || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center">
            <Trophy className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Leaderboard</h1>
            <p className="text-sm text-muted-foreground">Season {seasonId}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        {error ? (
          <div className="p-4 text-sm text-red-600">{error}</div>
        ) : !rows ? (
          <div className="p-4 text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No results yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2">#</th>
                <th className="text-left px-4 py-2">FID</th>
                <th className="text-right px-4 py-2">Pts</th>
                <th className="text-right px-4 py-2">W</th>
                <th className="text-right px-4 py-2">D</th>
                <th className="text-right px-4 py-2">L</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.fid}-${i}`} className="border-t border-border">
                  <td className="px-4 py-2">{i + 1}</td>
                  <td className="px-4 py-2">{r.fid}</td>
                  <td className="px-4 py-2 text-right font-semibold">{r.points}</td>
                  <td className="px-4 py-2 text-right">{r.w}</td>
                  <td className="px-4 py-2 text-right">{r.d}</td>
                  <td className="px-4 py-2 text-right">{r.l}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </GlassCard>
    </>
  );
}
