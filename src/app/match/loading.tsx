import { GlassCard } from '@/components/glass/GlassCard';
import { RouteLoadingFrame } from '@/components/RouteLoadingFrame';

export default function Loading(): JSX.Element {
  return (
    <RouteLoadingFrame maxW="max-w-5xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="p-4 lg:col-span-2">
          <div className="glass-skeleton h-72 w-full rounded" />
        </GlassCard>
        <GlassCard className="p-4 space-y-3">
          <div className="glass-skeleton h-6 w-40 rounded" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-skeleton h-4 w-full rounded" />
          ))}
        </GlassCard>
      </div>
    </RouteLoadingFrame>
  );
}
