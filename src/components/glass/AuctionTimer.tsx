'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuctionTimerProps {
  endsAt: string;
  className?: string;
  compact?: boolean;
  onExpired?: () => void;
}

export function AuctionTimer({
  endsAt,
  className,
  compact = false,
  onExpired,
}: AuctionTimerProps): JSX.Element {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isExpired, setIsExpired] = useState<boolean>(false);

  useEffect(() => {
    const updateTimer = (): void => {
      const end = new Date(endsAt);
      const now = new Date();
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Ended');
        setIsExpired(true);
        if (onExpired) {
          onExpired();
        }
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        setTimeRemaining(`${days}d ${remainingHours}h`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [endsAt, onExpired]);

  if (compact) {
    return (
      <div className={cn(
        'inline-flex items-center gap-1 text-xs font-mono',
        isExpired ? 'text-muted-foreground' : 'text-foreground',
        className
      )}>
        <Clock className="h-3 w-3" />
        <span>{timeRemaining}</span>
      </div>
    );
  }

  return (
    <div className={cn(
      'glass rounded-lg px-3 py-2',
      isExpired && 'opacity-50',
      className
    )}>
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4" />
        <div className="flex flex-col">
          <span className="text-xs font-medium text-muted-foreground">
            {isExpired ? 'Auction Ended' : 'Time Remaining'}
          </span>
          <span className="text-lg font-bold font-mono">{timeRemaining}</span>
        </div>
      </div>
    </div>
  );
}
