import { GlassCard } from '@/components/glass/GlassCard';
import { RouteLoadingFrame } from '@/components/RouteLoadingFrame';

export default function Loading(): JSX.Element {
  return (
    <RouteLoadingFrame maxW="max-w-3xl">
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
    </RouteLoadingFrame>
  );
}
