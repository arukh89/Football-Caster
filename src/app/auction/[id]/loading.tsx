import { GlassCard } from '@/components/glass/GlassCard';

export default function Loading(): JSX.Element {
  return (
    <div className="min-h-screen mobile-safe md:pt-20 pb-20 md:pb-8" aria-busy="true" aria-live="polite">
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="glass-skeleton h-20 w-20 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="glass-skeleton h-6 w-48 rounded" />
              <div className="glass-skeleton h-4 w-32 rounded" />
            </div>
            <div className="glass-skeleton h-10 w-28 rounded" />
          </div>
          <div className="glass-skeleton h-32 w-full rounded" />
        </GlassCard>
      </div>
    </div>
  );
}
