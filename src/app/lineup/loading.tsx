import { GlassCard } from '@/components/glass/GlassCard';

export default function Loading(): JSX.Element {
  return (
    <div className="min-h-screen mobile-safe md:pt-20 pb-20 md:pb-8" aria-busy="true" aria-live="polite">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <GlassCard className="p-6">
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="glass-skeleton h-16 w-full rounded" />
                <div className="glass-skeleton h-3 w-3/4 rounded" />
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
