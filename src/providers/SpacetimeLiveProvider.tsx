"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getSpacetime } from "@/lib/spacetime/client";

type Ctx = { version: number; ready: boolean };

const SpacetimeLiveContext = createContext<Ctx>({ version: 0, ready: false });

export function useSpacetimeLive(): Ctx {
  return useContext(SpacetimeLiveContext);
}

export function SpacetimeLiveProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [version, setVersion] = useState(0);
  const [ready, setReady] = useState(false);
  const wired = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const st: any = await getSpacetime();

        // Ensure only wired once per runtime
        if (wired.current) {
          setReady(true);
          return;
        }
        wired.current = true;

        // Subscribe applied/error hooks for visibility (best effort)
        try {
          st.subscriptionBuilder?.().onApplied(() => {
            if (!cancelled) setReady(true);
          }).onError(() => {
            // keep running; we'll still get cache updates if connection recovers
          });
        } catch {}

        // Tables we care about for live UI
        const tables: any[] = [
          st.db?.npcRegistry,
          st.db?.listing,
          st.db?.auction,
          st.db?.inbox,
        ].filter(Boolean);

        const bump = () => setVersion((v) => v + 1);

        for (const t of tables) {
          try { t.onInsert?.((_ctx: any, _row: any) => bump()); } catch {}
          try { t.onUpdate?.((_ctx: any, _old: any, _row: any) => bump()); } catch {}
          try { t.onDelete?.((_ctx: any, _row: any) => bump()); } catch {}
        }

        // Initial ready if no subscription callback fires
        setReady(true);
      } catch (err) {
        // Connection errors are surfaced via UI fetch flows; keep provider inert
        console.warn("[STDB] Live provider init failed:", err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const value = useMemo(() => ({ version, ready }), [version, ready]);
  return (
    <SpacetimeLiveContext.Provider value={value}>
      {children}
    </SpacetimeLiveContext.Provider>
  );
}
