'use client';

import * as React from 'react';
import StarterPackModal from '@/components/starter/StarterPackModal';

export function StarterExperience({ children }: { children: React.ReactNode }): JSX.Element {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    // Show on first visit or after tutorial
    const seen = typeof window !== 'undefined' ? localStorage.getItem('starterPackSeen') : '1';
    const tutorialDone = typeof window !== 'undefined' ? localStorage.getItem('tutorialDone') : null;
    const skip = typeof window !== 'undefined' ? localStorage.getItem('skipTutorial') : null;
    // Allow forcing via URL
    let force = false;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('forceStarter') === '1') force = true;
    } catch {}
    // Realtime only: show if not seen and tutorial flags/forced
    if (!seen && (force || tutorialDone || skip)) setOpen(true);
  }, []);

  return (
    <>
      {children}
      <StarterPackModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export default StarterExperience;
