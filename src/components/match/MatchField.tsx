'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { TeamInMatch, MatchEventData } from '@/lib/match/engine';

interface MatchFieldProps {
  homeTeam: TeamInMatch;
  awayTeam: TeamInMatch;
  weather: string;
  events?: MatchEventData[];
}

export function MatchField({ homeTeam, awayTeam, weather, events }: MatchFieldProps): JSX.Element {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [ballPos, setBallPos] = React.useState<{ x: number; y: number }>({ x: 50, y: 50 });
  // Formation positioning (simplified 2D)
  const getFormationLayout = (formation: string): { def: number; mid: number; fwd: number } => {
    const [d, m, f] = formation.split('').map(Number);
    return { def: d, mid: m, fwd: f };
  };

  const homeLayout = getFormationLayout(homeTeam.formation);
  const awayLayout = getFormationLayout(awayTeam.formation);

  const renderPlayers = (team: TeamInMatch, isHome: boolean): JSX.Element[] => {
    const layout = isHome ? homeLayout : awayLayout;
    const players: JSX.Element[] = [];
    
    // Goalkeeper
    const gk = team.lineup.find((p) => p.position === 'GK');
    if (gk) {
      players.push(
        <motion.div
          key={gk.id}
          className={`absolute ${isHome ? 'bottom-4' : 'top-4'} left-1/2 transform -translate-x-1/2`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className={`w-8 h-8 rounded-full ${isHome ? 'bg-blue-500' : 'bg-red-500'} border-2 border-white shadow-lg flex items-center justify-center`}>
            <span className="text-white text-xs font-bold">{gk.rating}</span>
          </div>
          <div className="text-center text-[10px] font-medium mt-1 text-white drop-shadow-md">
            {gk.name.split(' ').pop()}
          </div>
        </motion.div>
      );
    }

    // Defenders
    const defenders = team.lineup.filter((p) => p.position === 'DEF').slice(0, layout.def);
    defenders.forEach((player, idx) => {
      const totalDef = defenders.length;
      const xPos = ((idx + 1) / (totalDef + 1)) * 100;
      players.push(
        <motion.div
          key={player.id}
          className={`absolute ${isHome ? 'bottom-20' : 'top-20'}`}
          style={{ left: `${xPos}%` }}
          initial={{ scale: 0, x: '-50%' }}
          animate={{ scale: 1, x: '-50%' }}
          transition={{ delay: 0.2 + idx * 0.1 }}
        >
          <div className={`w-8 h-8 rounded-full ${isHome ? 'bg-blue-500' : 'bg-red-500'} border-2 border-white shadow-lg flex items-center justify-center`}>
            <span className="text-white text-xs font-bold">{player.rating}</span>
          </div>
          <div className="text-center text-[10px] font-medium mt-1 text-white drop-shadow-md">
            {player.name.split(' ').pop()}
          </div>
        </motion.div>
      );
    });

    // Midfielders
    const midfielders = team.lineup.filter((p) => p.position === 'MID').slice(0, layout.mid);
    midfielders.forEach((player, idx) => {
      const totalMid = midfielders.length;
      const xPos = ((idx + 1) / (totalMid + 1)) * 100;
      players.push(
        <motion.div
          key={player.id}
          className={`absolute ${isHome ? 'bottom-40' : 'top-40'}`}
          style={{ left: `${xPos}%` }}
          initial={{ scale: 0, x: '-50%' }}
          animate={{ scale: 1, x: '-50%' }}
          transition={{ delay: 0.3 + idx * 0.1 }}
        >
          <div className={`w-8 h-8 rounded-full ${isHome ? 'bg-blue-500' : 'bg-red-500'} border-2 border-white shadow-lg flex items-center justify-center`}>
            <span className="text-white text-xs font-bold">{player.rating}</span>
          </div>
          <div className="text-center text-[10px] font-medium mt-1 text-white drop-shadow-md">
            {player.name.split(' ').pop()}
          </div>
        </motion.div>
      );
    });

    // Forwards
    const forwards = team.lineup.filter((p) => p.position === 'FWD').slice(0, layout.fwd);
    forwards.forEach((player, idx) => {
      const totalFwd = forwards.length;
      const xPos = ((idx + 1) / (totalFwd + 1)) * 100;
      players.push(
        <motion.div
          key={player.id}
          className={`absolute ${isHome ? 'bottom-60' : 'top-60'}`}
          style={{ left: `${xPos}%` }}
          initial={{ scale: 0, x: '-50%' }}
          animate={{ scale: 1, x: '-50%' }}
          transition={{ delay: 0.4 + idx * 0.1 }}
        >
          <div className={`w-8 h-8 rounded-full ${isHome ? 'bg-blue-500' : 'bg-red-500'} border-2 border-white shadow-lg flex items-center justify-center`}>
            <span className="text-white text-xs font-bold">{player.rating}</span>
          </div>
          <div className="text-center text-[10px] font-medium mt-1 text-white drop-shadow-md">
            {player.name.split(' ').pop()}
          </div>
        </motion.div>
      );
    });

    return players;
  };

  // Helper to set ball animation target (percents inside container)
  const animateBallTo = (x: number, y: number): void => {
    setBallPos({ x, y });
  };

  // React to latest match events
  React.useEffect(() => {
    if (!events || events.length === 0) return;
    const last = events[events.length - 1];

    // Basic heuristics: animate ball for shots/saves/goals/corners/fouls
    if (['shot', 'save', 'goal', 'corner', 'foul'].includes(last.type)) {
      const isHome = last.team === 'home';
      // X spread center-ish
      const fromX = Math.max(10, Math.min(90, 25 + Math.random() * 50));
      const toX = 50 + (Math.random() * 16 - 8);

      if (last.type === 'corner') {
        const cornerX = Math.random() < 0.5 ? 2 : 98;
        const cornerY = isHome ? 2 : 98;
        animateBallTo(cornerX, cornerY);
        // After small delay, cross into box
        setTimeout(() => animateBallTo(50 + (Math.random() * 20 - 10), isHome ? 18 : 82), 200);
        return;
      }

      if (['shot', 'save', 'goal'].includes(last.type)) {
        // From attacking third toward goal
        const startY = isHome ? 35 : 65;
        const endY = isHome ? 3 : 97;
        animateBallTo(fromX, startY);
        setTimeout(() => animateBallTo(toX, endY), 150);
        return;
      }

      if (last.type === 'foul') {
        // Move ball to midfield area
        animateBallTo(50, 50 + (isHome ? -8 : 8));
        return;
      }
    }

    // Light movement for other events (kickoff, half-time, etc.) to show activity
    const jitterX = 45 + Math.random() * 10;
    const jitterY = 45 + Math.random() * 10;
    animateBallTo(jitterX, jitterY);
  }, [events]);

  const getWeatherEffect = (): JSX.Element | null => {
    if (weather === 'rainy') {
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 50 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-0.5 h-8 bg-blue-300/30"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-${Math.random() * 100}px`,
              }}
              animate={{
                y: ['0vh', '120vh'],
              }}
              transition={{
                duration: 1 + Math.random(),
                repeat: Infinity,
                ease: 'linear',
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>
      );
    }
    
    if (weather === 'snowy') {
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-white rounded-full opacity-70"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-${Math.random() * 100}px`,
              }}
              animate={{
                y: ['0vh', '120vh'],
                x: ['-10px', '10px', '-10px'],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                ease: 'linear',
                delay: Math.random() * 3,
              }}
            />
          ))}
        </div>
      );
    }
    
    return null;
  };

  return (
    <div ref={containerRef} className="relative w-full h-[600px] md:h-[700px] bg-gradient-to-b from-green-700 via-green-600 to-green-700 rounded-lg overflow-hidden shadow-2xl border-4 border-white">
      {/* Field markings */}
      <div className="absolute inset-0">
        {/* Center circle */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white/30 rounded-full" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white/30 rounded-full" />
        
        {/* Half-way line */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/30" />
        
        {/* Penalty areas */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-48 h-20 border-2 border-white/30 border-b-0" />
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-48 h-20 border-2 border-white/30 border-t-0" />
        
        {/* Goal areas */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-24 h-10 border-2 border-white/30 border-b-0" />
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-10 border-2 border-white/30 border-t-0" />
        
        {/* Corner arcs */}
        <div className="absolute bottom-0 left-0 w-8 h-8 border-2 border-white/30 border-b-0 border-l-0 rounded-br-full" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-2 border-white/30 border-b-0 border-r-0 rounded-bl-full" />
        <div className="absolute top-0 left-0 w-8 h-8 border-2 border-white/30 border-t-0 border-l-0 rounded-tr-full" />
        <div className="absolute top-0 right-0 w-8 h-8 border-2 border-white/30 border-t-0 border-r-0 rounded-tl-full" />
      </div>

      {/* Weather effects */}
      {getWeatherEffect()}

      {/* Players */}
      {renderPlayers(homeTeam, true)}
      {renderPlayers(awayTeam, false)}

      {/* Ball */}
      <motion.div
        className="absolute w-3 h-3 md:w-3.5 md:h-3.5 bg-white rounded-full shadow-[0_0_0_2px_rgba(0,0,0,0.15)]"
        animate={{ left: `${ballPos.x}%`, top: `${ballPos.y}%` }}
        transition={{ type: 'tween', ease: 'easeOut', duration: 0.35 }}
        style={{ transform: 'translate(-50%, -50%)' }}
      />

      {/* Team labels */}
      <div className="absolute bottom-2 left-2 bg-blue-500/80 text-white px-3 py-1 rounded text-sm font-bold">
        {homeTeam.name}
      </div>
      <div className="absolute top-2 right-2 bg-red-500/80 text-white px-3 py-1 rounded text-sm font-bold">
        {awayTeam.name}
      </div>
    </div>
  );
}
