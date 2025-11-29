'use client';

import { useMemo } from 'react';
import { DEV_FID } from '@/lib/constants';
import type { HoldStatus } from '@/lib/types';

/**
 * Hook to check if a player is under hold period
 * Dev FID is exempt from holds
 */
export function useHoldStatus(
  ownerFid: number,
  holdEnd: string | null
): HoldStatus {
  return useMemo(() => {
    // Dev FID bypass
    if (ownerFid === DEV_FID) {
      return {
        isActive: false,
        endsAt: null,
        hoursRemaining: null,
      };
    }

    // No hold period set
    if (!holdEnd) {
      return {
        isActive: false,
        endsAt: null,
        hoursRemaining: null,
      };
    }

    const holdEndDate = new Date(holdEnd);
    const now = new Date();
    const isActive = now < holdEndDate;

    if (!isActive) {
      return {
        isActive: false,
        endsAt: null,
        hoursRemaining: null,
      };
    }

    const hoursRemaining = Math.ceil(
      (holdEndDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    );

    return {
      isActive: true,
      endsAt: holdEndDate,
      hoursRemaining,
    };
  }, [ownerFid, holdEnd]);
}
