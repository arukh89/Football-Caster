"use client";

import { useEffect, useMemo, useState } from "react";
import { GlassCard } from "@/components/glass/GlassCard";
import { Navigation, DesktopNav } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { quickAuth } from "@farcaster/miniapp-sdk";
import { useIsInFarcaster } from "@/hooks/useIsInFarcaster";
import { CONTRACT_ADDRESSES, DEV_FID } from "@/lib/constants";

type Me = { fid: number; wallet: string } | null;
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

export default function AdminNpcPage(): JSX.Element {
  const isInFarcaster = useIsInFarcaster();
  const fetcher = (input: RequestInfo | URL, init?: RequestInit) =>
    (isInFarcaster ? (quickAuth.fetch as any) : fetch)(input as any, init as any);

  const [me, setMe] = useState<Me>(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [sort, setSort] = useState<"lastActive" | "fid" | "difficulty" | "confidence">("lastActive");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [data, setData] = useState<PageResp>({ items: [], total: 0, page: 1, pageSize: 25 });
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // load me
  useEffect(() => {
    (async () => {
      try {
        setLoadingMe(true);
        const res = await fetcher("/api/auth/me");
        if (!res.ok) throw new Error("Unauthorized");
        const a = await res.json();
        setMe({ fid: Number(a.fid), wallet: String(a.wallet || "").toLowerCase() });
        setAuthError(null);
      } catch (e) {
        setAuthError("Unauthorized");
      } finally {
        setLoadingMe(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAdmin = useMemo(() => {
    if (!me) return false;
    return me.fid === DEV_FID || me.wallet === CONTRACT_ADDRESSES.treasury.toLowerCase();
  }, [me]);

  // fetch list
  useEffect(() => {
    if (!isAdmin) return;
    const controller = new AbortController();
    (async () => {
      try {
        setLoadingList(true);
        setListError(null);
        const p = new URLSearchParams();
        p.set("page", String(page));
        p.set("pageSize", String(pageSize));
        if (search.trim()) p.set("search", search.trim());
        if (activeOnly) p.set("active", "1");
        if (ownedOnly) p.set("owned", "1");
        p.set("sort", sort);
        p.set("order", order);
        const res = await fetcher(`/api/admin/npc/list?${p.toString()}`, { signal: controller.signal });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Failed to load");
        setData(json as PageResp);
      } catch (e) {
        if ((e as any).name !== "AbortError") setListError((e as Error).message);
      } finally {
        setLoadingList(false);
      }
    })();
    return () => controller.abort();
  }, [isAdmin, page, pageSize, search, activeOnly, ownedOnly, sort, order]);

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  if (loadingMe) return (
    <>
      <DesktopNav />
      <div className="min-h-screen mobile-safe md:pt-20 pb-20 md:pb-8">
        <div className="container mx-auto p-4">Loading...</div>
      </div>
      <Navigation />
    </>
  );

  if (!isAdmin) return (
    <>
      <DesktopNav />
      <div className="min-h-screen mobile-safe md:pt-20 pb-20 md:pb-8">
        <div className="container mx-auto p-4">
          <GlassCard className="p-4">
            <div className="font-bold mb-2">Admin — NPCs</div>
            <div className="text-sm text-muted-foreground">Forbidden</div>
          </GlassCard>
        </div>
      </div>
      <Navigation />
    </>
  );

  return (
    <>
      <DesktopNav />
      <div className="min-h-screen mobile-safe md:pt-20 pb-20 md:pb-8">
        <div className="container mx-auto p-4">
          <div className="mb-3 font-bold text-lg">NPC Managers</div>
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
                <Label>Owned by me</Label>
                <div className="flex items-center gap-2">
                  <Switch checked={ownedOnly} onCheckedChange={(v) => { setPage(1); setOwnedOnly(!!v); }} />
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
                    {loadingList && (
                      <tr><td className="px-3 py-3" colSpan={7}>Loading…</td></tr>
                    )}
                    {!loadingList && listError && (
                      <tr><td className="px-3 py-3 text-red-500" colSpan={7}>{listError}</td></tr>
                    )}
                    {!loadingList && !listError && data.items.length === 0 && (
                      <tr><td className="px-3 py-3" colSpan={7}>No results</td></tr>
                    )}
                    {!loadingList && !listError && data.items.map((n) => (
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
