'use client';

import { useEffect, useMemo, useState } from 'react';
import { Users, Save, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/glass/GlassCard';
import { DragDropSquad } from '@/components/squad/DragDropSquad';
import { DesktopNav, Navigation } from '@/components/Navigation';
import { useFarcasterIdentity } from '@/hooks/useFarcasterIdentity';
// Snapshots removed
import type { Player } from '@/lib/types';

function storageKey(fid: number, key: string): string {
  return `fc:${fid}:${key}`;
}

export default function LineupEditorPage(): JSX.Element {
  const { identity } = useFarcasterIdentity();
  const fid = useMemo(() => identity?.fid ?? 250704, [identity]);

  const [players, setPlayers] = useState<Player[]>([]);
  const [lineup, setLineup] = useState<Player[]>([]);
  const [subs, setSubs] = useState<Player[]>([]);
  const [saving, setSaving] = useState(false);

  // Load players from realtime API
  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const res = await fetch(`/api/players/mine`, { cache: 'no-store' });
        const data = await res.json();
        const mine = (data.players || []) as Player[];
      setPlayers(mine);

      // Load saved lineup/subs
      const savedLine = localStorage.getItem(storageKey(fid, 'lineup'));
      const savedSubs = localStorage.getItem(storageKey(fid, 'subs'));
      if (savedLine || savedSubs) {
        const idsL = savedLine ? (JSON.parse(savedLine) as string[]) : [];
        const idsS = savedSubs ? (JSON.parse(savedSubs) as string[]) : [];
        const byId = new Map(mine.map((p) => [p.playerId, p] as const));
        setLineup(idsL.map((id) => byId.get(id)).filter(Boolean) as Player[]);
        setSubs(idsS.map((id) => byId.get(id)).filter(Boolean) as Player[]);
      } else {
        setLineup(mine.slice(0, 11));
        setSubs(mine.slice(11));
      }
      } catch {}
    };
    void load();
  }, [fid]);

  const handleSave = async (): Promise<void> => {
    try {
      setSaving(true);
      localStorage.setItem(storageKey(fid, 'lineup'), JSON.stringify(lineup.map((p) => p.playerId)));
      localStorage.setItem(storageKey(fid, 'subs'), JSON.stringify(subs.map((p) => p.playerId)));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = (): void => {
    setLineup(players.slice(0, 11));
    setSubs(players.slice(11));
  };

  return (
    <>
      <DesktopNav />
      <div className="min-h-screen mobile-safe md:pt-20 pb-20 md:pb-8">
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">Lineup Editor</h1>
                <p className="text-sm text-muted-foreground">Realtime lineup editor</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" /> Reset
              </Button>
              <Button onClick={handleSave} className="championship-button" disabled={saving}>
                <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>

          <GlassCard className="mb-6">
            <DragDropSquad
              lineup={lineup}
              subs={subs}
              onLineupChange={(l, s) => {
                setLineup(l);
                setSubs(s);
              }}
            />
          </GlassCard>
        </div>
      </div>
      <Navigation />
    </>
  );
}
