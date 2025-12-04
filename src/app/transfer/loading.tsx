import { GlassCard } from '@/components/glass/GlassCard';

export default function Loading(): JSX.Element {
  return (
    <div className="min-h-screen mobile-safe md:pt-20 pb-20 md:pb-8" aria-busy="true" aria-live="polite">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <GlassCard className="p-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="glass-skeleton h-10 w-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="glass-skeleton h-4 w-1/2 rounded" />
                <div className="glass-skeleton h-3 w-1/3 rounded" />
              </div>
              <div className="glass-skeleton h-8 w-24 rounded" />
            </div>
          ))}
        </GlassCard>
      </div>
    </div>
  );
}
