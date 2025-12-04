import { GlassCard } from '@/components/glass/GlassCard';

export default function Loading(): JSX.Element {
  return (
    <div className="min-h-screen mobile-safe md:pt-20 pb-20 md:pb-8" aria-busy="true" aria-live="polite">
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <GlassCard key={i} className="p-3">
              <div className="glass-skeleton h-24 w-full rounded" />
              <div className="mt-2 glass-skeleton h-4 w-2/3 rounded" />
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}
