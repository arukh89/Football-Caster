'use client';

import { Zap, Target, Wind, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { GlassCard } from '@/components/glass/GlassCard';
import type { MatchTactics } from '@/lib/match/engine';

interface TacticsPanelProps {
  currentTactics: MatchTactics;
  onTacticsChange: (tactics: Partial<MatchTactics>) => void;
  disabled?: boolean;
}

export function TacticsPanel({ currentTactics, onTacticsChange, disabled }: TacticsPanelProps): JSX.Element {
  const mentalityOptions = [
    { value: 'ultra-defensive', label: 'Ultra Def', icon: '🛡️', color: 'bg-red-500' },
    { value: 'defensive', label: 'Defensive', icon: '🛡️', color: 'bg-orange-500' },
    { value: 'balanced', label: 'Balanced', icon: '⚖️', color: 'bg-yellow-500' },
    { value: 'attacking', label: 'Attacking', icon: '⚔️', color: 'bg-blue-500' },
    { value: 'ultra-attacking', label: 'Ultra Att', icon: '⚔️', color: 'bg-emerald-500' },
  ] as const;

  const tempoOptions = [
    { value: 'slow', label: 'Slow', icon: '🐢' },
    { value: 'normal', label: 'Normal', icon: '⏱️' },
    { value: 'fast', label: 'Fast', icon: '⚡' },
  ] as const;

  const widthOptions = [
    { value: 'narrow', label: 'Narrow', icon: '↔️' },
    { value: 'normal', label: 'Normal', icon: '↕️' },
    { value: 'wide', label: 'Wide', icon: '↗️' },
  ] as const;

  const pressingOptions = [
    { value: 'low', label: 'Low Press', icon: '⬇️' },
    { value: 'medium', label: 'Med Press', icon: '➡️' },
    { value: 'high', label: 'High Press', icon: '⬆️' },
  ] as const;

  return (
    <GlassCard className="p-4 championship-card">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-5 w-5 text-emerald-500" />
        <h3 className="font-bold text-lg">Quick Tactics</h3>
      </div>

      {/* Mentality */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Mentality</span>
        </div>
        <div className="grid grid-cols-5 gap-1">
          {mentalityOptions.map((option) => (
            <Button
              key={option.value}
              variant={currentTactics.mentality === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => onTacticsChange({ mentality: option.value })}
              disabled={disabled}
              className={`text-xs flex flex-col items-center gap-1 h-auto py-2 ${
                currentTactics.mentality === option.value ? 'championship-button' : ''
              }`}
            >
              <span className="text-lg">{option.icon}</span>
              <span className="hidden md:inline">{option.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Tempo */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Tempo</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {tempoOptions.map((option) => (
            <Button
              key={option.value}
              variant={currentTactics.tempo === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => onTacticsChange({ tempo: option.value })}
              disabled={disabled}
              className={`gap-2 ${
                currentTactics.tempo === option.value ? 'championship-button' : ''
              }`}
            >
              <span>{option.icon}</span>
              <span className="text-xs">{option.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Width */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Wind className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Width</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {widthOptions.map((option) => (
            <Button
              key={option.value}
              variant={currentTactics.width === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => onTacticsChange({ width: option.value })}
              disabled={disabled}
              className={`gap-2 ${
                currentTactics.width === option.value ? 'championship-button' : ''
              }`}
            >
              <span>{option.icon}</span>
              <span className="text-xs">{option.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Pressing */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Pressing</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {pressingOptions.map((option) => (
            <Button
              key={option.value}
              variant={currentTactics.pressing === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => onTacticsChange({ pressing: option.value })}
              disabled={disabled}
              className={`gap-2 ${
                currentTactics.pressing === option.value ? 'championship-button' : ''
              }`}
            >
              <span>{option.icon}</span>
              <span className="text-xs">{option.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}
