"use client";

import { useEffect, useMemo, useState } from "react";
import { DesktopNav, Navigation } from "@/components/Navigation";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useIsInFarcaster } from "@/hooks/useIsInFarcaster";
import { quickAuth } from "@farcaster/miniapp-sdk";
import { useSpacetimeLive } from "@/providers/SpacetimeLiveProvider";

type Npc = {
  npcFid: number;
  tokenId: string | null;
  difficultyTier: number;
  ownerFid: number | null;
  managerConfidence: number;
  active: boolean;
  lastActiveAt: string | null;
};

type PageResp = { items: Npc[]; total: number; page: number; pageSize: number };

export default function NpcDirectoryPage(): JSX.Element {
  const isInFarcaster = useIsInFarcaster();
  const { version } = useSpacetimeLive();
  const fetcher = (input: RequestInfo | URL, init?: RequestInit) =>
    (isInFarcaster ? (quickAuth.fetch as any) : fetch)(input as any, init as any);

  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [sort, setSort] = useState<"lastActive" | "fid" | "difficulty" | "confidence">("lastActive");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [data, setData] = useState<PageResp>({ items: [], total: 0, page: 1, pageSize: 25 });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const p = new URLSearchParams();
        p.set("page", String(page));
        p.set("pageSize", String(pageSize));
        if (search.trim()) p.set("search", search.trim());
        if (activeOnly) p.set("active", "1");
        p.set("sort", sort);
        p.set("order", order);
        const res = await fetcher(`/api/npc/list?${p.toString()}`, { signal: controller.signal });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Failed to load NPCs");
        setData(json as PageResp);
      } catch (e) {
        if ((e as any).name !== "AbortError") setErr((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [page, pageSize, search, activeOnly, sort, order, version]);

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <>
      <DesktopNav />
      <div className="min-h-screen mobile-safe md:pt-20 pb-20 md:pb-8">
        <div className="container mx-auto p-4">
          <div className="mb-3 font-bold text-lg">NPC Directory</div>

          <GlassCard className="p-4">
            <div className="grid md:grid-cols-5 gap-3 items-end">
              <div className="grid gap-1 md:col-span-2">
                <Label htmlFor="search">Search</Label>
                <Input id="search" placeholder="FID / tokenId / persona" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
              </div>
              <div className="grid gap-1">
                <Label>Active only</Label>
                <div className="flex items-center gap-2">
                  <Switch checked={activeOnly} onCheckedChange={(v) => { setPage(1); setActiveOnly(!!v); }} />
                </div>
              </div>
              <div className="grid gap-1">
                <Label>Sort</Label>
                <div className="flex gap-2">
                  <Select value={sort} onValueChange={(v) => { setPage(1); setSort(v as any); }}>
                    <SelectTrigger className="w-[140px]"><SelectValue placeholder="Sort" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lastActive">Last Active</SelectItem>
                      <SelectItem value="fid">FID</SelectItem>
                      <SelectItem value="difficulty">Difficulty</SelectItem>
                      <SelectItem value="confidence">Confidence</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={order} onValueChange={(v) => { setPage(1); setOrder(v as any); }}>
                    <SelectTrigger className="w-[110px]"><SelectValue placeholder="Order" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Desc</SelectItem>
                      <SelectItem value="asc">Asc</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </GlassCard>

          <div className="mt-4">
            <GlassCard className="p-0 overflow-hidden">
              <div className="p-3 border-b border-border flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Total: {data.total}</div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="pageSize">Per page</Label>
                  <Select value={String(pageSize)} onValueChange={(v) => { setPage(1); setPageSize(parseInt(v, 10)); }}>
                    <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left bg-muted/30">
                      <th className="px-3 py-2">FID</th>
                      <th className="px-3 py-2">Owner</th>
                      <th className="px-3 py-2">Token</th>
                      <th className="px-3 py-2">Difficulty</th>
                      <th className="px-3 py-2">Confidence</th>
                      <th className="px-3 py-2">Active</th>
                      <th className="px-3 py-2">Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr><td className="px-3 py-3" colSpan={7}>Loading…</td></tr>
                    )}
                    {!loading && err && (
                      <tr><td className="px-3 py-3 text-red-500" colSpan={7}>{err}</td></tr>
                    )}
                    {!loading && !err && data.items.length === 0 && (
                      <tr><td className="px-3 py-3" colSpan={7}>No results</td></tr>
                    )}
                    {!loading && !err && data.items.map((n) => (
                      <tr key={n.npcFid} className="odd:bg-muted/20">
                        <td className="px-3 py-2 font-mono">{n.npcFid}</td>
                        <td className="px-3 py-2">{n.ownerFid ?? '-'}</td>
                        <td className="px-3 py-2">{n.tokenId ?? '-'}</td>
                        <td className="px-3 py-2">{n.difficultyTier}</td>
                        <td className="px-3 py-2">{n.managerConfidence}</td>
                        <td className="px-3 py-2">{n.active ? 'Yes' : 'No'}</td>
                        <td className="px-3 py-2">{n.lastActiveAt ? new Date(n.lastActiveAt).toLocaleString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3 border-t border-border flex items-center justify-between">
                <div className="text-xs text-muted-foreground">Page {page} / {totalPages}</div>
                <div className="flex gap-2">
                  <Button variant="outline" disabled={!canPrev} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
                  <Button variant="outline" disabled={!canNext} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
      <Navigation />
    </>
  );
}
