import { Bot, Code } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEV_FID } from '@/lib/constants';

interface PlayerBadgesProps {
  isNpc?: boolean;
  ownerFid?: number;
  className?: string;
}

export function PlayerBadges({ isNpc, ownerFid, className }: PlayerBadgesProps): JSX.Element | null {
  const isDev = ownerFid === DEV_FID;

  if (!isNpc && !isDev) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {isNpc && (
        <span className="npc-badge">
          <Bot className="h-3 w-3" />
          <span>NPC</span>
        </span>
      )}
      {isDev && (
        <span className="dev-badge">
          <Code className="h-3 w-3" />
          <span>DEV</span>
        </span>
      )}
    </div>
  );
}
