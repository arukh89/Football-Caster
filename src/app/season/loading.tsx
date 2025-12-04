import { GlassCard } from '@/components/glass/GlassCard';

export default function Loading(): JSX.Element {
  return (
    <div className="min-h-screen mobile-safe md:pt-20 pb-20 md:pb-8" aria-busy="true" aria-live="polite">
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GlassCard className="p-4 space-y-3">
            <div className="glass-skeleton h-6 w-1/3 rounded" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="glass-skeleton h-4 w-full rounded" />
            ))}
          </GlassCard>
          <GlassCard className="p-4 space-y-3">
            <div className="glass-skeleton h-6 w-1/3 rounded" />
            <div className="glass-skeleton h-48 w-full rounded" />
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
