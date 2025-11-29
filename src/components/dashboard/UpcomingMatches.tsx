'use client';

import { Calendar, MapPin, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/glass/GlassCard';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

interface Match {
  id: string;
  opponent: string;
  date: string;
  time: string;
  venue: 'home' | 'away';
  competition: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface UpcomingMatchesProps {
  matches: Match[];
}

export function UpcomingMatches({ matches }: UpcomingMatchesProps): JSX.Element {
  const router = useRouter();
  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500/20 text-green-500';
      case 'medium': return 'bg-yellow-500/20 text-yellow-500';
      case 'hard': return 'bg-red-500/20 text-red-500';
      default: return 'bg-gray-500/20 text-gray-500';
    }
  };

  return (
    <GlassCard className="championship-card">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-5 w-5 text-emerald-500" />
        <h3 className="font-bold text-lg">Upcoming Matches</h3>
      </div>
      <div className="space-y-3">
        {matches.map((match) => (
          <div 
            key={match.id}
            className="glass rounded-lg p-4 hover:scale-[1.02] transition-transform cursor-pointer border border-white/10"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold text-lg">{match.opponent}</h4>
                  <Badge variant={match.venue === 'home' ? 'default' : 'outline'} className="text-xs">
                    {match.venue === 'home' ? '🏠 Home' : '✈️ Away'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {match.date}
                  </div>
                  <div className="flex items-center gap-1">
                    <Trophy className="h-3 w-3" />
                    {match.competition}
                  </div>
                </div>
              </div>
              <Badge className={getDifficultyColor(match.difficulty)}>
                {match.difficulty}
              </Badge>
            </div>
            <Button size="sm" className="w-full championship-button" onClick={() => router.push('/lineup')}>
              Prepare Team
            </Button>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
