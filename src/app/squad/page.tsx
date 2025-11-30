'use client';

import { useState, useEffect } from 'react';
import { Users, ChevronDown, Trophy, Target, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GlassCard } from '@/components/glass/GlassCard';
import { StatPill } from '@/components/glass/StatPill';
import { PlayerCard } from '@/components/PlayerCard';
import { DragDropSquad } from '@/components/squad/DragDropSquad';
import { Navigation, DesktopNav } from '@/components/Navigation';
import { useFarcasterIdentity } from '@/hooks/useFarcasterIdentity';
import { FORMATIONS } from '@/lib/constants';
import type { Player } from '@/lib/types';

export default function SquadPage(): JSX.Element {
  const { identity } = useFarcasterIdentity();
  // Realtime-only: fetch from API
  const fid = identity?.fid ?? 250704;
  const [selectedFormation, setSelectedFormation] = useState<string>('442');
  const [myPlayers, setMyPlayers] = useState<Player[]>([]);
  const [lineup, setLineup] = useState<Player[]>([]);
  const [subs, setSubs] = useState<Player[]>([]);
  const [showDragDrop, setShowDragDrop] = useState<boolean>(false);

  const userClub = undefined as any;
  const currentFormation = FORMATIONS.find((f) => f.id === selectedFormation);

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const res = await fetch(`/api/players/mine`, { cache: 'no-store' });
        const data = await res.json();
        const my = (data.players || []) as Player[];
        setMyPlayers(my);

      // Set initial lineup and subs based on club data
      // Prefer locally saved lineup/subs from lineup editor (mock mode)
      const keyL = `fc:${fid}:lineup`;
      const keyS = `fc:${fid}:subs`;
      const savedL = typeof window !== 'undefined' ? localStorage.getItem(keyL) : null;
      const savedS = typeof window !== 'undefined' ? localStorage.getItem(keyS) : null;
      if (savedL || savedS) {
        const idsL = savedL ? (JSON.parse(savedL) as string[]) : [];
        const idsS = savedS ? (JSON.parse(savedS) as string[]) : [];
        const byId = new Map(my.map((p) => [p.playerId, p] as const));
        setLineup(idsL.map((id) => byId.get(id)).filter(Boolean) as Player[]);
        setSubs(idsS.map((id) => byId.get(id)).filter(Boolean) as Player[]);
      } else {
        // Default to first 11 in lineup
        setLineup(my.slice(0, 11));
        setSubs(my.slice(11));
      }
      } catch {}
    };
    void load();
  }, [fid]);

  const calculateTeamRating = (): number => {
    if (lineup.length === 0) return 0;
    const totalRating = lineup.reduce((sum, p) => sum + p.rating, 0);
    return Math.round(totalRating / lineup.length);
  };

  const calculateChemistry = (): number => {
    // Simplified chemistry calculation
    // In production, this would factor in formation fit, morale, coach style, etc.
    const moraleAvg = lineup.reduce((sum, p) => sum + p.morale, 0) / Math.max(lineup.length, 1);
    return Math.round(moraleAvg * 0.8); // Chemistry correlates with morale
  };

  return (
    <>
      <DesktopNav />
      <div className="min-h-screen mobile-safe md:pt-20 pb-20 md:pb-8">
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">My Squad</h1>
                <p className="text-sm text-muted-foreground">
                  Manage your lineup and formation
                </p>
              </div>
            </div>
          </div>

          {/* Team Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <GlassCard>
              <div className="flex items-center gap-3">
                <Trophy className="h-8 w-8 text-yellow-500" />
                <div>
                  <div className="text-xs text-muted-foreground">Team Rating</div>
                  <div className="text-xl font-bold">{calculateTeamRating()}</div>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center gap-3">
                <Target className="h-8 w-8 text-green-500" />
                <div>
                  <div className="text-xs text-muted-foreground">Chemistry</div>
                  <div className="text-xl font-bold">{calculateChemistry()}</div>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-500" />
                <div>
                  <div className="text-xs text-muted-foreground">Squad Size</div>
                  <div className="text-xl font-bold">{myPlayers.length}</div>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex flex-col">
                <div className="text-xs text-muted-foreground mb-1">Formation</div>
                <Select value={selectedFormation} onValueChange={setSelectedFormation}>
                  <SelectTrigger className="h-8 text-sm font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMATIONS.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </GlassCard>
          </div>

          {/* Formation Visualization */}
          <GlassCard className="mb-6">
            <h3 className="text-lg font-bold mb-4">Starting Lineup ({currentFormation?.name})</h3>
            <div className="min-h-[300px] bg-pitch-green/5 rounded-lg p-4 relative">
              <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 to-green-900/5 rounded-lg" />
              <div className="relative">
                {lineup.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No players in lineup. Add players from your squad.
                  </div>
                ) : (
                  <div className="grid grid-cols-11 gap-2">
                    {lineup.map((player) => (
                      <div key={player.playerId} className="text-center">
                        <div className="w-full aspect-square bg-primary/10 rounded-full mb-1 flex items-center justify-center text-xs font-bold">
                          {player.position}
                        </div>
                        <div className="text-xs truncate">{player.name.split(' ').pop()}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </GlassCard>

          {/* Drag & Drop Toggle */}
          <div className="mb-6">
            <Button
              onClick={() => setShowDragDrop(!showDragDrop)}
              variant="outline"
              className="w-full md:w-auto championship-button"
            >
              {showDragDrop ? 'Hide' : 'Show'} Drag & Drop Editor
            </Button>
          </div>

          {/* Drag & Drop Squad Editor */}
          {showDragDrop && (
            <div className="mb-6">
              <DragDropSquad
                lineup={lineup}
                subs={subs}
                onLineupChange={(newLineup, newSubs) => {
                  setLineup(newLineup);
                  setSubs(newSubs);
                }}
              />
            </div>
          )}

          {/* Starting XI */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Starting XI</h2>
              <StatPill label="Active" value={lineup.length} variant="success" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lineup.map((player) => (
                <PlayerCard key={player.playerId} player={player} compact showHold />
              ))}
            </div>
          </div>

          {/* Substitutes */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Substitutes</h2>
              <StatPill label="Available" value={subs.length} variant="default" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subs.map((player) => (
                <PlayerCard key={player.playerId} player={player} compact showHold />
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="fixed bottom-20 md:bottom-8 left-0 right-0 px-4 flex justify-center gap-3">
            <Button size="lg" variant="outline" className="glass gap-2">
              <ChevronDown className="h-5 w-5" />
              Change Formation
            </Button>
            <Button size="lg" className="championship-button gap-2">
              <Save className="h-5 w-5" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>
      <Navigation />
    </>
  );
}
