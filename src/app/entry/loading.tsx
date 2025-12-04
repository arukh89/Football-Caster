import { GlassCard } from '@/components/glass/GlassCard';

export default function Loading(): JSX.Element {
  return (
    <div className="min-h-screen mobile-safe md:pt-20 pb-20 md:pb-8" aria-busy="true" aria-live="polite">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <GlassCard className="p-6 space-y-4">
          <div className="glass-skeleton h-6 w-40 rounded" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass-skeleton h-10 w-full rounded" />
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
