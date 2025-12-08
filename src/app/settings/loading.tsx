import { GlassCard } from '@/components/glass/GlassCard';
import { RouteLoadingFrame } from '@/components/RouteLoadingFrame';

export default function Loading(): JSX.Element {
  return (
    <RouteLoadingFrame maxW="max-w-2xl">
      <GlassCard className="p-6 space-y-4">
        <div className="glass-skeleton h-6 w-32 rounded" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="glass-skeleton h-4 w-40 rounded" />
            <div className="glass-skeleton h-10 w-full rounded" />
          </div>
        ))}
      </GlassCard>
    </RouteLoadingFrame>
  );
}
