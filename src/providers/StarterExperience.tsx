'use client';

import * as React from 'react';
import StarterPackModal from '@/components/starter/StarterPackModal';

export function StarterExperience({ children }: { children: React.ReactNode }): JSX.Element {
  const [open, setOpen] = React.useState(false);

  // Modal no longer auto-opens; homepage shows StarterPackCard. Modal can be opened by explicit triggers in future.

  return (
    <>
      {children}
      <StarterPackModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export default StarterExperience;
