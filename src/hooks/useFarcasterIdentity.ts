'use client';

import { useState, useEffect } from 'react';
import { quickAuth } from '@farcaster/miniapp-sdk';
import type { FarcasterIdentity } from '@/lib/types';

/**
 * Hook to get Farcaster identity using the SDK
 * Uses the official Farcaster API with API key
 */
export function useFarcasterIdentity(): {
  identity: FarcasterIdentity | null;
  isLoading: boolean;
  error: string | null;
} {
  const [identity, setIdentity] = useState<FarcasterIdentity | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchIdentity = async (): Promise<void> => {
      try {
        // Use Quick Auth to make an authenticated request to our backend
        const res = await quickAuth.fetch('/api/auth/me');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (mounted) {
          const ident: FarcasterIdentity = { fid: Number(data.fid) };
          setIdentity(ident);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch Farcaster identity:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setIsLoading(false);
        }
      }
    };

    fetchIdentity();

    return () => {
      mounted = false;
    };
  }, []);

  return { identity, isLoading, error };
}
