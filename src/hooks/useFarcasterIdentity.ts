'use client';

import { useState, useEffect } from 'react';
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
        // Waiting for Farcaster SDK integration; no shim/mock fallback
        if (mounted) {
          setIdentity(null);
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
