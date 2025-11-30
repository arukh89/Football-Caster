'use client';

import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, SkipForward, Trophy, Activity, Cloud, CloudRain, CloudSnow, Wind, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { GlassCard } from '@/components/glass/GlassCard';
import { StatPill } from '@/components/glass/StatPill';
import { Navigation, DesktopNav } from '@/components/Navigation';
import { MatchField } from '@/components/match/MatchField';
import { MatchCommentary } from '@/components/match/MatchCommentary';
import { TacticsPanel } from '@/components/match/TacticsPanel';
import { MatchSimulator, type MatchState, type MatchTactics, type WeatherCondition } from '@/lib/match/engine';
import { useFarcasterIdentity } from '@/hooks/useFarcasterIdentity';

export default function MatchPage(): JSX.Element {
  const { identity } = useFarcasterIdentity();
  const [myPlayers, setMyPlayers] = useState<any[] | null>(null);
  const [simulator, setSimulator] = useState<MatchSimulator | null>(null);
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);
  const [commentaryEnabled, setCommentaryEnabled] = useState<boolean>(true);

  // Load owned players for gating
  useEffect(() => {
    (async () => {
      try {
        if (!identity?.fid) return;
        const res = await fetch(`/api/players/mine`, { cache: 'no-store' });
        const data = await res.json();
        setMyPlayers(data.players || []);
      } catch {
        setMyPlayers([]);
      }
    })();
  }, [identity?.fid]);

  // Initialize match
  useEffect(() => {
    const homeTeam = {
      name: 'Home FC',
      formation: '442',
      chemistry: 75,
      tactics: {
        mentality: 'balanced' as const,
        width: 'normal' as const,
        tempo: 'normal' as const,
        pressing: 'medium' as const,
      },
      lineup: [
        { id: '1', name: 'John Keeper', position: 'GK', rating: 78, stamina: 100, morale: 80, attributes: { pace: 50, shooting: 30, passing: 60, dribbling: 40, defending: 85, physical: 75 } },
        { id: '2', name: 'Alex Defender', position: 'DEF', rating: 75, stamina: 100, morale: 75, attributes: { pace: 65, shooting: 40, passing: 65, dribbling: 50, defending: 85, physical: 80 } },
        { id: '3', name: 'Ben Strong', position: 'DEF', rating: 77, stamina: 100, morale: 78, attributes: { pace: 62, shooting: 38, passing: 68, dribbling: 48, defending: 87, physical: 85 } },
        { id: '4', name: 'Chris Rock', position: 'DEF', rating: 76, stamina: 100, morale: 77, attributes: { pace: 68, shooting: 45, passing: 70, dribbling: 55, defending: 83, physical: 78 } },
        { id: '5', name: 'Dan Wall', position: 'DEF', rating: 74, stamina: 100, morale: 76, attributes: { pace: 63, shooting: 42, passing: 67, dribbling: 52, defending: 84, physical: 82 } },
        { id: '6', name: 'Eric Pass', position: 'MID', rating: 80, stamina: 100, morale: 82, attributes: { pace: 72, shooting: 70, passing: 85, dribbling: 75, defending: 65, physical: 68 } },
        { id: '7', name: 'Frank Speed', position: 'MID', rating: 79, stamina: 100, morale: 81, attributes: { pace: 85, shooting: 68, passing: 78, dribbling: 80, defending: 60, physical: 65 } },
        { id: '8', name: 'George Control', position: 'MID', rating: 78, stamina: 100, morale: 79, attributes: { pace: 70, shooting: 72, passing: 82, dribbling: 78, defending: 68, physical: 70 } },
        { id: '9', name: 'Harry Vision', position: 'MID', rating: 77, stamina: 100, morale: 78, attributes: { pace: 74, shooting: 75, passing: 80, dribbling: 76, defending: 62, physical: 66 } },
        { id: '10', name: 'Ivan Strike', position: 'FWD', rating: 82, stamina: 100, morale: 85, attributes: { pace: 88, shooting: 88, passing: 72, dribbling: 82, defending: 40, physical: 72 } },
        { id: '11', name: 'Jack Goal', position: 'FWD', rating: 81, stamina: 100, morale: 83, attributes: { pace: 86, shooting: 86, passing: 70, dribbling: 80, defending: 38, physical: 70 } },
      ],
    };

    const awayTeam = {
      name: 'Away United',
      formation: '433',
      chemistry: 72,
      tactics: {
        mentality: 'balanced' as const,
        width: 'normal' as const,
        tempo: 'normal' as const,
        pressing: 'medium' as const,
      },
      lineup: [
        { id: 'a1', name: 'Mike Glove', position: 'GK', rating: 76, stamina: 100, morale: 78, attributes: { pace: 48, shooting: 28, passing: 58, dribbling: 38, defending: 83, physical: 73 } },
        { id: 'a2', name: 'Nick Block', position: 'DEF', rating: 74, stamina: 100, morale: 74, attributes: { pace: 64, shooting: 38, passing: 64, dribbling: 48, defending: 84, physical: 79 } },
        { id: 'a3', name: 'Oscar Solid', position: 'DEF', rating: 76, stamina: 100, morale: 76, attributes: { pace: 61, shooting: 36, passing: 67, dribbling: 47, defending: 86, physical: 84 } },
        { id: 'a4', name: 'Paul Tackle', position: 'DEF', rating: 75, stamina: 100, morale: 75, attributes: { pace: 67, shooting: 44, passing: 69, dribbling: 54, defending: 82, physical: 77 } },
        { id: 'a5', name: 'Quinn Engine', position: 'MID', rating: 79, stamina: 100, morale: 80, attributes: { pace: 71, shooting: 69, passing: 84, dribbling: 74, defending: 64, physical: 67 } },
        { id: 'a6', name: 'Ryan Dynamo', position: 'MID', rating: 78, stamina: 100, morale: 79, attributes: { pace: 84, shooting: 67, passing: 77, dribbling: 79, defending: 59, physical: 64 } },
        { id: 'a7', name: 'Sam Creator', position: 'MID', rating: 77, stamina: 100, morale: 78, attributes: { pace: 69, shooting: 71, passing: 81, dribbling: 77, defending: 67, physical: 69 } },
        { id: 'a8', name: 'Tom Finisher', position: 'FWD', rating: 80, stamina: 100, morale: 82, attributes: { pace: 87, shooting: 87, passing: 71, dribbling: 81, defending: 39, physical: 71 } },
        { id: 'a9', name: 'Uma Pacey', position: 'FWD', rating: 79, stamina: 100, morale: 81, attributes: { pace: 90, shooting: 82, passing: 68, dribbling: 85, defending: 35, physical: 65 } },
        { id: 'a10', name: 'Victor Sharp', position: 'FWD', rating: 78, stamina: 100, morale: 80, attributes: { pace: 85, shooting: 84, passing: 69, dribbling: 79, defending: 37, physical: 68 } },
        { id: 'a11', name: 'Will Wing', position: 'MID', rating: 76, stamina: 100, morale: 77, attributes: { pace: 82, shooting: 65, passing: 75, dribbling: 80, defending: 58, physical: 63 } },
      ],
    };

    const sim = new MatchSimulator(homeTeam, awayTeam);
    
    sim.onStateChange((state) => {
      setMatchState(state);
    });

    setSimulator(sim);
    setMatchState(sim.getState());
  }, []);

  // Auto-play timer
  useEffect(() => {
    if (!simulator || !isPlaying) return;

    const interval = setInterval(() => {
      simulator.simulateMinute();
      if (simulator.getState().minute >= 90) {
        setIsPlaying(false);
      }
    }, 1000 / speed);

    return () => clearInterval(interval);
  }, [simulator, isPlaying, speed]);

  const handlePlayPause = useCallback((): void => {
    if (!simulator) return;
    
    if (!matchState?.isPlaying && matchState?.minute === 0) {
      simulator.start();
    }
    
    setIsPlaying(!isPlaying);
  }, [simulator, isPlaying, matchState]);

  const handleSkipMinute = useCallback((): void => {
    if (!simulator) return;
    simulator.simulateMinute();
  }, [simulator]);

  const handleTacticsChange = useCallback((tactics: Partial<MatchTactics>): void => {
    if (!simulator) return;
    simulator.changeTactics('home', tactics);
  }, [simulator]);

  const getWeatherIcon = (weather: WeatherCondition): JSX.Element => {
    switch (weather) {
      case 'sunny': return <Sun className="h-5 w-5 text-yellow-500" />;
      case 'cloudy': return <Cloud className="h-5 w-5 text-gray-400" />;
      case 'rainy': return <CloudRain className="h-5 w-5 text-blue-500" />;
      case 'snowy': return <CloudSnow className="h-5 w-5 text-blue-300" />;
      case 'windy': return <Wind className="h-5 w-5 text-gray-500" />;
      default: return <Cloud className="h-5 w-5" />;
    }
  };

  // Gate: require at least 11 players to play a match
  if (myPlayers && myPlayers.length < 11) {
    return (
      <>
        <DesktopNav />
        <div className="min-h-screen mobile-safe md:pt-20 pb-20 md:pb-8 flex items-center justify-center">
          <GlassCard className="p-6 max-w-md text-center">
            <Trophy className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
            <div className="font-bold text-lg mb-1">You need a squad to play</div>
            <div className="text-sm text-muted-foreground mb-4">Claim the Starter Pack or acquire players from the market.</div>
            <div className="flex gap-2 justify-center">
              <a href="/transfer"><Button>Market</Button></a>
              <a href="/"><Button variant="outline">Home</Button></a>
            </div>
          </GlassCard>
        </div>
        <Navigation />
      </>
    );
  }

  if (!matchState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-12 w-12 animate-spin mx-auto mb-4 text-emerald-500" />
          <p>Loading match...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <DesktopNav />
      <div className="min-h-screen mobile-safe md:pt-20 pb-20 md:pb-8">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold championship-title">Live Match</h1>
                <p className="text-sm text-muted-foreground">
                  {matchState.homeTeam.name} vs {matchState.awayTeam.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getWeatherIcon(matchState.weather)}
              <span className="text-sm font-medium capitalize">{matchState.weather}</span>
            </div>
          </div>

          {/* Score & Match Info */}
          <GlassCard className="mb-6 championship-card match-day-glow">
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <div className="text-4xl font-bold championship-title">{matchState.homeScore}</div>
                <div className="text-sm text-muted-foreground">{matchState.homeTeam.name}</div>
              </div>
              <div className="text-center px-6">
                <div className="text-6xl font-bold text-emerald-500">{matchState.minute}'</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {matchState.minute < 45 ? '1st Half' : matchState.minute === 45 ? 'Half Time' : matchState.minute < 90 ? '2nd Half' : 'Full Time'}
                </div>
              </div>
              <div className="text-center flex-1">
                <div className="text-4xl font-bold championship-title">{matchState.awayScore}</div>
                <div className="text-sm text-muted-foreground">{matchState.awayTeam.name}</div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <Progress value={(matchState.minute / 90) * 100} className="h-2" />
            </div>
          </GlassCard>

          {/* Match Controls */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <Button
              size="lg"
              onClick={handlePlayPause}
              className="championship-button gap-2"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              {isPlaying ? 'Pause' : matchState.minute === 0 ? 'Start' : 'Resume'}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleSkipMinute}
              disabled={matchState.minute >= 90}
              className="gap-2"
            >
              <SkipForward className="h-5 w-5" />
              +1 Min
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm">Speed:</span>
              <Button
                size="sm"
                variant={speed === 1 ? 'default' : 'outline'}
                onClick={() => setSpeed(1)}
              >
                1x
              </Button>
              <Button
                size="sm"
                variant={speed === 2 ? 'default' : 'outline'}
                onClick={() => setSpeed(2)}
              >
                2x
              </Button>
              <Button
                size="sm"
                variant={speed === 4 ? 'default' : 'outline'}
                onClick={() => setSpeed(4)}
              >
                4x
              </Button>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Left: Stats */}
            <div className="space-y-4">
              <GlassCard className="championship-card">
                <h3 className="font-bold mb-3">Match Statistics</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Possession</span>
                      <span>{matchState.possession.home}% - {matchState.possession.away}%</span>
                    </div>
                    <div className="flex gap-1">
                      <div className="h-2 bg-blue-500 rounded-l" style={{ width: `${matchState.possession.home}%` }} />
                      <div className="h-2 bg-red-500 rounded-r" style={{ width: `${matchState.possession.away}%` }} />
                    </div>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span>Shots</span>
                    <span>{matchState.shots.home} - {matchState.shots.away}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span>On Target</span>
                    <span>{matchState.shotsOnTarget.home} - {matchState.shotsOnTarget.away}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span>Corners</span>
                    <span>{matchState.corners.home} - {matchState.corners.away}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span>Fouls</span>
                    <span>{matchState.fouls.home} - {matchState.fouls.away}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span>Yellow Cards</span>
                    <span className="text-yellow-500">
                      {matchState.yellowCards.home} - {matchState.yellowCards.away}
                    </span>
                  </div>

                  {(matchState.redCards.home > 0 || matchState.redCards.away > 0) && (
                    <div className="flex justify-between text-sm">
                      <span>Red Cards</span>
                      <span className="text-red-500">
                        {matchState.redCards.home} - {matchState.redCards.away}
                      </span>
                    </div>
                  )}
                </div>
              </GlassCard>

              <TacticsPanel
                currentTactics={matchState.homeTeam.tactics}
                onTacticsChange={handleTacticsChange}
                disabled={!matchState.isPlaying}
              />
            </div>

            {/* Center: Field */}
            <div className="lg:col-span-2">
              <MatchField
                homeTeam={matchState.homeTeam}
                awayTeam={matchState.awayTeam}
                weather={matchState.weather}
                events={matchState.events}
              />
            </div>
          </div>

          {/* Commentary */}
          <MatchCommentary
            events={matchState.events}
            enabled={commentaryEnabled}
            onToggle={() => setCommentaryEnabled(!commentaryEnabled)}
          />
        </div>
      </div>
      <Navigation />
    </>
  );
}
