import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HoldStatus } from '@/lib/types';

interface HoldTimerProps {
  holdStatus: HoldStatus;
  className?: string;
  compact?: boolean;
}

export function HoldTimer({ holdStatus, className, compact = false }: HoldTimerProps): JSX.Element | null {
  if (!holdStatus.isActive) {
    return null;
  }

  const formatTime = (hours: number): string => {
    if (hours < 24) {
      return `${hours}h remaining`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  };

  if (compact) {
    return (
      <div className={cn('inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400', className)}>
        <Clock className="h-3 w-3" />
        <span>{holdStatus.hoursRemaining}h</span>
      </div>
    );
  }

  return (
    <div className={cn('hold-warning', className)}>
      <Clock className="h-4 w-4" />
      <div className="flex flex-col">
        <span className="text-xs font-semibold">Transfer Hold</span>
        <span className="text-xs">
          {holdStatus.hoursRemaining !== null && formatTime(holdStatus.hoursRemaining)}
        </span>
      </div>
    </div>
  );
}
