'use client';

import * as React from 'react';
import { GlassCard } from '@/components/glass/GlassCard';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, MessageSquare } from 'lucide-react';
import type { MatchEventData } from '@/lib/match/engine';

interface MatchCommentaryProps {
  events: MatchEventData[];
  enabled: boolean;
  onToggle: () => void;
}

export function MatchCommentary({ events, enabled, onToggle }: MatchCommentaryProps): JSX.Element {
  const getDotClass = (sig: MatchEventData['significance']): string => {
    switch (sig) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-yellow-500';
      case 'medium':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <GlassCard className="championship-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-emerald-500" />
          <h3 className="font-bold text-lg">Live Commentary</h3>
        </div>
        <Button size="sm" variant="outline" onClick={onToggle} className="gap-2">
          {enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          {enabled ? 'On' : 'Off'}
        </Button>
      </div>

      {!enabled ? (
        <div className="text-sm text-muted-foreground">Commentary disabled</div>
      ) : (
        <div className="max-h-64 overflow-y-auto pr-2 space-y-2">
          {events.length === 0 && (
            <div className="text-sm text-muted-foreground">No events yet...</div>
          )}
          {events.slice().reverse().map((ev, idx) => (
            <div key={idx} className="flex items-start gap-3 p-2 rounded-lg glass">
              <div className={`w-2 h-2 rounded-full mt-2 ${getDotClass(ev.significance)}`} />
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">{ev.minute}' • {ev.type.replace('_', ' ')}</div>
                <div className="text-sm">{ev.commentary || ev.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

export default MatchCommentary;
