import { GlassCard } from '@/components/glass/GlassCard';
import { RouteLoadingFrame } from '@/components/RouteLoadingFrame';

export default function Loading(): JSX.Element {
  return (
    <RouteLoadingFrame maxW="max-w-5xl">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <GlassCard key={i} className="p-3">
            <div className="glass-skeleton h-24 w-full rounded" />
            <div className="mt-2 glass-skeleton h-4 w-2/3 rounded" />
          </GlassCard>
        ))}
      </div>
    </RouteLoadingFrame>
  );
}
