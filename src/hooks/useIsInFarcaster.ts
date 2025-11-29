'use client';

import { useEffect, useState } from 'react';

export function useIsInFarcaster(): boolean {
  const [isIn, setIsIn] = useState(false);

  useEffect(() => {
    try {
      const referrer = typeof document !== 'undefined' ? document.referrer : '';
      const embedded = typeof window !== 'undefined' && !!(window as any).farcaster;
      setIsIn(/warpcast\.com/.test(referrer) || embedded);
    } catch {
      setIsIn(false);
    }
  }, []);

  return isIn;
}
