"use client";

import * as React from 'react';

type Props = {
  onRefresh: () => Promise<void> | void;
  threshold?: number; // px
  children: React.ReactNode;
};

export default function PullToRefresh({ onRefresh, threshold = 60, children }: Props): JSX.Element {
  const startY = React.useRef<number | null>(null);
  const pulling = React.useRef(false);
  const [offset, setOffset] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  const onTouchStart = (e: React.TouchEvent) => {
    if (loading) return;
    if (window.scrollY > 0) return; // only at top
    startY.current = e.touches[0].clientY;
    pulling.current = true;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!pulling.current || startY.current == null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) {
      e.preventDefault();
      setOffset(Math.min(dy, threshold * 1.5));
    }
  };

  const onTouchEnd = async () => {
    if (!pulling.current) return;
    pulling.current = false;
    const shouldRefresh = offset >= threshold;
    setOffset(0);
    if (shouldRefresh) {
      try {
        setLoading(true);
        await onRefresh();
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        transition: pulling.current ? 'none' : 'transform 150ms ease-out',
        transform: offset ? `translateY(${offset}px)` : undefined,
      }}
    >
      <div className="h-0 overflow-visible text-center text-xs text-muted-foreground">
        {(offset > 0 || loading) && (
          <div className="py-2">{loading ? 'Refreshing…' : offset >= threshold ? 'Release to refresh' : 'Pull to refresh'}</div>
        )}
      </div>
      {children}
    </div>
  );
}
