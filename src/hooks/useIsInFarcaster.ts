'use client';

import { useEffect, useState } from 'react';

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

      setIsIn(embeddedGlobals || uaHints || refHints || qsHints);
    } catch {
      setIsIn(false);
    }
  }, []);

  return isIn;
}
