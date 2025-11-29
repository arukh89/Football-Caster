import { User } from 'lucide-react';
import { GlassCard } from './glass/GlassCard';
import { StatPill } from './glass/StatPill';
import { PlayerBadges } from './glass/PlayerBadges';
import { HoldTimer } from './glass/HoldTimer';
import { useHoldStatus } from '@/hooks/useHoldStatus';
import { cn } from '@/lib/utils';
import type { Player } from '@/lib/types';

interface PlayerCardProps {
  player: Player;
  onClick?: () => void;
  showHold?: boolean;
  compact?: boolean;
  className?: string;
}

const positionColors: Record<string, string> = {
  GK: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300',
  DEF: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
  MID: 'bg-green-500/20 text-green-700 dark:text-green-300',
  FWD: 'bg-red-500/20 text-red-700 dark:text-red-300',
};

const getMoraleColor = (morale: number): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
  if (morale >= 80) return 'success';
  if (morale >= 50) return 'default';
  if (morale >= 30) return 'warning';
  return 'danger';
};

export function PlayerCard({
  player,
  onClick,
  showHold = false,
  compact = false,
  className,
}: PlayerCardProps): JSX.Element {
  const holdStatus = useHoldStatus(player.ownerFid, player.holdEnd);

  if (compact) {
    return (
      <GlassCard
        hover={!!onClick}
        onClick={onClick}
        className={cn('p-3', className)}
      >
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            {player.avatar ? (
              <img
                src={player.avatar}
                alt={player.name}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <User className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className={cn(
              'absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded text-xs font-bold',
              positionColors[player.position]
            )}>
              {player.position}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold truncate">{player.name}</h3>
              <PlayerBadges isNpc={player.isNpc} ownerFid={player.ownerFid} />
            </div>
            <div className="flex items-center gap-2">
              <StatPill label="RAT" value={player.rating} variant="default" />
              <StatPill label="MOR" value={player.morale} variant={getMoraleColor(player.morale)} />
            </div>
          </div>
        </div>
        {showHold && <HoldTimer holdStatus={holdStatus} className="mt-2" />}
      </GlassCard>
    );
  }

  return (
    <GlassCard
      hover={!!onClick}
      onClick={onClick}
      className={cn('p-4', className)}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="relative">
            {player.avatar ? (
              <img
                src={player.avatar}
                alt={player.name}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className={cn(
              'absolute -bottom-1 -right-1 px-2 py-1 rounded text-xs font-bold',
              positionColors[player.position]
            )}>
              {player.position}
            </div>
          </div>
          <PlayerBadges isNpc={player.isNpc} ownerFid={player.ownerFid} />
        </div>

        <div>
          <h3 className="font-bold text-lg mb-1">{player.name}</h3>
          <div className="flex items-center gap-2">
            <StatPill label="RAT" value={player.rating} variant="info" />
            <StatPill label="XP" value={player.xp} variant="default" />
            <StatPill label="MOR" value={player.morale} variant={getMoraleColor(player.morale)} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex flex-col">
            <span className="text-muted-foreground">PAC</span>
            <span className="font-bold">{player.attributes.pace}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">SHO</span>
            <span className="font-bold">{player.attributes.shooting}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">PAS</span>
            <span className="font-bold">{player.attributes.passing}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">DRI</span>
            <span className="font-bold">{player.attributes.dribbling}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">DEF</span>
            <span className="font-bold">{player.attributes.defending}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">PHY</span>
            <span className="font-bold">{player.attributes.physical}</span>
          </div>
        </div>

        {showHold && <HoldTimer holdStatus={holdStatus} />}
      </div>
    </GlassCard>
  );
}
