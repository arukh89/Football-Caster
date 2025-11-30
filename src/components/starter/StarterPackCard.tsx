"use client";

import * as React from "react";
import { Gift, ArrowRight } from "lucide-react";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { quickAuth } from "@farcaster/miniapp-sdk";

export function StarterPackCard(): JSX.Element | null {
  const [loading, setLoading] = React.useState(true);
  const [claiming, setClaiming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [hasClaimed, setHasClaimed] = React.useState<boolean | null>(null);

  const refreshStatus = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await quickAuth.fetch("/api/starter-pack/status", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { hasClaimed: boolean };
      setHasClaimed(!!data.hasClaimed);
    } catch (e) {
      setError("Failed to load starter pack status");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const handleClaim = async (): Promise<void> => {
    try {
      setClaiming(true);
      setError(null);
      const res = await fetch("/api/starter/claim", { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Claim failed");
      }
      await refreshStatus();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setClaiming(false);
    }
  };

  if (loading) return null;
  if (hasClaimed) return null;

  return (
    <GlassCard className="mb-6 p-4 border-emerald-500/30">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-xl bg-emerald-500/15 flex items-center justify-center">
          <Gift className="h-6 w-6 text-emerald-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-lg">Claim Starter Pack</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            One-time reward: get 18 tradable players to kickstart your squad.
          </p>
          {error && <div className="text-sm text-red-500 mb-2">{error}</div>}
          <Button onClick={handleClaim} disabled={claiming} className="gap-2 championship-button">
            {claiming ? "Processing..." : "Claim now"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </GlassCard>
  );
}

export default StarterPackCard;
