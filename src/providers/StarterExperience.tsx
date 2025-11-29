'use client';

import * as React from 'react';
import StarterPackModal from '@/components/starter/StarterPackModal';
import { quickAuth } from '@farcaster/miniapp-sdk';

export function StarterExperience({ children }: { children: React.ReactNode }): JSX.Element {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await quickAuth.fetch('/api/starter/status', { cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (!cancelled && data && data.hasClaimed === false) setOpen(true);
      } catch {
        // Silent: if auth not available, do not block UI
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      {children}
      <StarterPackModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export default StarterExperience;
