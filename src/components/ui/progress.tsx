'use client';

import * as React from 'react';
import clsx from 'clsx';

export type ProgressProps = React.HTMLAttributes<HTMLDivElement> & {
  value?: number; // 0 - 100
};

export function Progress({ className, value = 0, ...props }: ProgressProps): JSX.Element {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={clsx('relative w-full overflow-hidden rounded-full bg-muted', className)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      role="progressbar"
      {...props}
    >
      <div
        className="h-full w-full origin-left bg-emerald-500 transition-[transform] duration-300"
        style={{ transform: `scaleX(${clamped / 100})` }}
      />
    </div>
  );
}

export default Progress;
