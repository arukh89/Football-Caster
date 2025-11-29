'use client';

import * as React from 'react';
import clsx from 'clsx';

export type ScrollAreaProps = React.HTMLAttributes<HTMLDivElement> & {
  viewportClassName?: string;
};

export const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, viewportClassName, ...props }, ref) => {
    return (
      <div className={clsx('relative', className)} {...props}>
        <div ref={ref} className={clsx('h-full w-full overflow-auto', viewportClassName)}>
          {children}
        </div>
      </div>
    );
  }
);

ScrollArea.displayName = 'ScrollArea';

export default ScrollArea;
