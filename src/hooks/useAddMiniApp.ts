'use client';

export function useAddMiniApp(): { addMiniApp: () => Promise<void> } {
  const addMiniApp = async (): Promise<void> => {
    // Placeholder for Farcaster Mini App install action
    try {
      // Intentionally no-op for local testing
    } catch (_) {
      // ignore
    }
  };

  return { addMiniApp };
}
