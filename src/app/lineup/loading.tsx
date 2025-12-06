import { GlassCard } from '@/components/glass/GlassCard';
import { RouteLoadingFrame } from '@/components/RouteLoadingFrame';

export default function Loading(): JSX.Element {
  return (
    <RouteLoadingFrame maxW="max-w-4xl">
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
    </RouteLoadingFrame>
  );
}
