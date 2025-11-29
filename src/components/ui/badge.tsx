'use client';

import * as React from 'react';
import clsx from 'clsx';

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'secondary' | 'outline';
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium';
    const variants: Record<NonNullable<BadgeProps['variant']>, string> = {
      default: 'bg-emerald-500/20 text-emerald-500',
      secondary: 'bg-muted text-foreground/80',
      outline: 'border border-border text-foreground',
    };

    return (
      <span ref={ref} className={clsx(base, variants[variant], className)} {...props} />
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
