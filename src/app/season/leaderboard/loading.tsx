import { GlassCard } from '@/components/glass/GlassCard';
import { RouteLoadingFrame } from '@/components/RouteLoadingFrame';

export default function Loading(): JSX.Element {
  return (
    <RouteLoadingFrame maxW="max-w-4xl">
      <GlassCard className="p-4">
        <div className="glass-skeleton h-6 w-32 rounded mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="glass-skeleton h-5 w-8 rounded" />
              <div className="glass-skeleton h-5 w-10 rounded-full" />
              <div className="glass-skeleton h-4 w-1/2 rounded" />
              <div className="ml-auto glass-skeleton h-4 w-16 rounded" />
            </div>
          ))}
        </div>
      </GlassCard>
    </RouteLoadingFrame>
  );
}
