'use client';

import * as React from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

export default function FarcasterWrapper({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  React.useEffect(() => {
    // Notify Warpcast the UI is ready to display
    void sdk.actions.ready();
  }, []);

  return <>{children}</>;
}
