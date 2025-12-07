"use client";

import * as React from "react";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';

type InboxMsg = { id: string; type: string | null; title: string; body: string; createdAtMs: number };

export function PvpNotifier(): JSX.Element | null {
  const [pending, setPending] = React.useState<InboxMsg | null>(null);
  const [loading, setLoading] = React.useState(false);

  const poll = React.useCallback(async () => {
    try {
      const res = await fetch('/api/inbox?unread=true', { cache: 'no-store' });
      if (!res.ok) return;
      const payload = await res.json();
      const data = payload?.data ?? payload;
      const msgs: InboxMsg[] = data?.messages || [];
      const m = msgs.find((x) => x.type === 'pvp_challenge');
      if (m) setPending(m);
    } catch (e) {
      console.error('Failed to poll inbox', e);
    }
  }, []);

  React.useEffect(() => {
    const onFocus = () => { void poll(); };
    const onVis = () => { if (!document.hidden) void poll(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    void poll();
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [poll]);

  const accept = async (): Promise<void> => {
    if (!pending) return;
    try {
      setLoading(true);
      const matchId = pending.id.replace('pvp-challenge-', '');
      await fetch('/api/pvp/accept', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matchId }) });
      setPending(null);
      toast.success('Match accepted');
    } finally {
      setLoading(false);
    }
  };

  const decline = (): void => { setPending(null); toast('Challenge dismissed'); };

  if (!pending) return null;

  return (
    <div className="fixed bottom-24 right-4 z-50 max-w-sm">
      <GlassCard className="p-4">
        <div className="font-bold mb-1">{pending.title || 'New PvP Challenge'}</div>
        <div className="text-sm text-muted-foreground mb-3">{pending.body || 'You have been challenged.'}</div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={decline}>Decline</Button>
          <Button onClick={accept} disabled={loading} className="championship-button">{loading ? 'Accepting...' : 'Accept'}</Button>
        </div>
      </GlassCard>
    </div>
  );
}

export default PvpNotifier;
