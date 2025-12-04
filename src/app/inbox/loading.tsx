import { GlassCard } from '@/components/glass/GlassCard';

export default function Loading(): JSX.Element {
  return (
    <div className="min-h-screen mobile-safe md:pt-20 pb-20 md:pb-8" aria-busy="true" aria-live="polite">
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <GlassCard key={i} className="p-4">
              <div className="flex items-start gap-3">
                <div className="glass-skeleton h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="glass-skeleton h-4 w-2/3 rounded" />
                  <div className="glass-skeleton h-3 w-1/2 rounded" />
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}
