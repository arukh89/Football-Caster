'use client';

import { useEffect } from 'react';
import { quickAuth } from '@farcaster/miniapp-sdk';

export function useQuickAuth(isInFarcaster: boolean): void {
  useEffect(() => {
    // Warm QuickAuth token when inside Farcaster to reduce auth latency
    if (!isInFarcaster) return;
    (async () => {
      try {
        await quickAuth.fetch('/api/auth/me', { cache: 'no-store' });
      } catch {
        // ignore; hook is best-effort
      }
    })();
  }, [isInFarcaster]);
}
