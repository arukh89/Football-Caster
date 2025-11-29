'use client';

import { useEffect } from 'react';

export function useQuickAuth(isInFarcaster: boolean): void {
  useEffect(() => {
    // Placeholder: integrate quick auth when Farcaster context is detected
    if (!isInFarcaster) return;
    // no-op for local testing
  }, [isInFarcaster]);
}
