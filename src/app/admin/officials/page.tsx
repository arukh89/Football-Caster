"use client";

import { useEffect, useState } from 'react';
import { GlassCard } from '@/components/glass/GlassCard';
import { Navigation, DesktopNav } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCcw, Shield, Users, Sparkles } from 'lucide-react';

type Official = {
  officialId: string;
  role: 'referee' | 'assistant_left' | 'assistant_right' | 'var';
  strictness: number;
  advantageTendency: number;
  offsideTolerance: number;
  varPropensity: number;
  consistency: number;
  fitness: number;
  reputation: number;
  aiSeed: number;
  active: boolean;
  lastAssignedMs: number;
  synthetic?: boolean;
}

export default function OfficialsAdminPage(): JSX.Element {
  const [loading, setLoading] = useState(false)
  const [officials, setOfficials] = useState<Official[]>([])
  const [synthetic, setSynthetic] = useState(false)
  const [seeding, setSeeding] = useState(false)

  const load = async (): Promise<void> => {
    setLoading(true)
    try {
      const r = await fetch('/api/officials', { cache: 'no-store' })
      const jp = await r.json()
      const j = jp?.data ?? jp
      setOfficials(j.officials || [])
      setSynthetic(!!j.synthetic)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const seedCrew = async (): Promise<void> => {
    setSeeding(true)
    try {
      await fetch('/api/officials/seed', { method: 'POST' })
      await load()
    } finally {
      setSeeding(false)
    }
  }

  const roleBadge = (r: Official['role']): JSX.Element => {
    const map: Record<Official['role'], { label: string; color: string }> = {
      referee: { label: 'Referee', color: 'bg-emerald-500' },
      assistant_left: { label: 'Asst. Left', color: 'bg-blue-500' },
      assistant_right: { label: 'Asst. Right', color: 'bg-indigo-500' },
      var: { label: 'VAR', color: 'bg-yellow-500' },
    }
    const it = map[r]
    return <span className={`text-[10px] px-2 py-0.5 rounded text-white ${it.color}`}>{it.label}</span>
  }

  return (
    <>
      <DesktopNav />
      <div className="min-h-screen mobile-safe md:pt-20 pb-20 md:pb-8">
        <div className="container mx-auto p-4 max-w-5xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-emerald-500" />
              <h1 className="text-xl md:text-2xl font-bold">Officials Management</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading} className="gap-2">
                <RefreshCcw className="h-4 w-4" /> Refresh
              </Button>
              <Button size="sm" onClick={() => void seedCrew()} disabled={seeding} className="gap-2 championship-button">
                <Sparkles className="h-4 w-4" /> {seeding ? 'Seeding...' : 'Seed Default Crew'}
              </Button>
            </div>
          </div>

          {synthetic && (
            <GlassCard className="p-3">
              <div className="text-xs text-muted-foreground">
                No officials in database. Showing synthetic sample crew. Use "Seed Default Crew" to attempt creating officials (backend reducers may be unimplemented in this build).
              </div>
            </GlassCard>
          )}

          <GlassCard>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div className="font-semibold">Officials ({officials.length})</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2">Role</th>
                      <th className="py-2">ID</th>
                      <th className="py-2">Status</th>
                      <th className="py-2 text-right">Strict</th>
                      <th className="py-2 text-right">Adv</th>
                      <th className="py-2 text-right">OffTol</th>
                      <th className="py-2 text-right">VAR</th>
                      <th className="py-2 text-right">Cons</th>
                      <th className="py-2 text-right">Fit</th>
                      <th className="py-2 text-right">Rep</th>
                      <th className="py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {officials.map((o, idx) => (
                      <tr key={o.officialId} className="border-b last:border-0">
                        <td className="py-2">{roleBadge(o.role)}</td>
                        <td className="py-2">
                          <div className="text-xs font-mono">{o.officialId}</div>
                        </td>
                        <td className="py-2">
                          {o.active ? <Badge className="bg-emerald-500">active</Badge> : <Badge variant="secondary">inactive</Badge>}
                        </td>
                        <td className="py-2 text-right">{o.strictness}</td>
                        <td className="py-2 text-right">{o.advantageTendency}</td>
                        <td className="py-2 text-right">{o.offsideTolerance}</td>
                        <td className="py-2 text-right">{o.varPropensity}</td>
                        <td className="py-2 text-right">{o.consistency}</td>
                        <td className="py-2 text-right">{o.fitness}</td>
                        <td className="py-2 text-right">{o.reputation}</td>
                        <td className="py-2 text-right">
                          <Button size="sm" variant="outline" onClick={async () => {
                            const next = !o.active
                            try { await fetch('/api/officials/toggle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ officialId: o.officialId, active: next }) }) } catch {}
                            setOfficials((prev) => prev.map((x, i) => i === idx ? { ...x, active: next } : x))
                          }}>
                            {o.active ? 'Deactivate' : 'Activate'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
      <Navigation />
    </>
  )
}
