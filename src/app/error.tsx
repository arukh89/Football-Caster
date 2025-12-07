"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/glass/GlassCard";
import { Navigation, DesktopNav } from "@/components/Navigation";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  useEffect(() => {
    // Best-effort logging
    console.error("Global error:", error);
  }, [error]);

  return (
    <>
      <DesktopNav />
      <div className="min-h-screen mobile-safe md:pt-20 pb-20 md:pb-8 flex items-center justify-center">
        <GlassCard className="p-6 max-w-md w-full text-center">
          <div className="font-bold text-lg mb-1">Something went wrong</div>
          <div className="text-sm text-muted-foreground mb-4">
            Try again or go back to the home page.
          </div>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => reset()}>Try again</Button>
            <a href="/"><Button variant="outline">Home</Button></a>
          </div>
        </GlassCard>
      </div>
      <Navigation />
    </>
  );
}
