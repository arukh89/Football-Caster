'use client';

import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

export function useIsInFarcaster(): boolean {
  const [isIn, setIsIn] = useState(false);

  useEffect(() => {
    try {
      const referrer = typeof document !== 'undefined' ? document.referrer : '';
      const win: any = typeof window !== 'undefined' ? window : undefined;
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      const qs = typeof window !== 'undefined' ? window.location.search : '';

      const embeddedGlobals = !!(win?.farcaster || win?.warpcast);
      const uaHints = /Warpcast|Farcaster/i.test(ua);
      const refHints = /warpcast\.com|farcaster/i.test(referrer);
      const qsHints = /fc_context|miniapp|warplet/i.test(qs);

      // If SDK is available, try reading context synchronously best-effort
      let sdkHint = false;
      try {
        sdkHint = !!sdk; // presence of SDK import
      } catch {}

      setIsIn(embeddedGlobals || uaHints || refHints || qsHints || sdkHint);
    } catch {
      setIsIn(false);
    }
  }, []);

  return isIn;
}
