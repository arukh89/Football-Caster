import React from 'react';

type Props = {
  children: React.ReactNode;
  maxW?: string; // Tailwind max-width utility, e.g. "max-w-4xl"
};

export function RouteLoadingFrame({ children, maxW = 'max-w-4xl' }: Props): JSX.Element {
  return (
    <div className="min-h-screen mobile-safe md:pt-20 pb-20 md:pb-8" aria-busy="true" aria-live="polite">
      <div className={`container mx-auto px-4 py-6 ${maxW}`}>{children}</div>
    </div>
  );
}
