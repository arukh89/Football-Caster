import { GlassCard } from '@/components/glass/GlassCard';
import { RouteLoadingFrame } from '@/components/RouteLoadingFrame';

export default function Loading(): JSX.Element {
  return (
    <RouteLoadingFrame maxW="max-w-4xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <GlassCard key={i} className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="glass-skeleton h-16 w-16 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="glass-skeleton h-4 w-40 rounded" />
                <div className="glass-skeleton h-3 w-28 rounded" />
              </div>
            </div>
            <div className="glass-skeleton h-8 w-full rounded" />
          </GlassCard>
        ))}
      </div>
    </RouteLoadingFrame>
  );
}
