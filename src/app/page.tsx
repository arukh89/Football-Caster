'use client'
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Trophy, Users, TrendingUp, Zap, ArrowRight, ShoppingBag, Gavel } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/glass/GlassCard';
import { StatPill } from '@/components/glass/StatPill';
import { Navigation, DesktopNav } from '@/components/Navigation';
import { PerformanceChart } from '@/components/dashboard/PerformanceChart';
import { UpcomingMatches } from '@/components/dashboard/UpcomingMatches';
import { OnboardingFlow } from '@/components/tutorial/OnboardingFlow';
import { StarterPackCard } from '@/components/starter/StarterPackCard';
import { useFarcasterIdentity } from '@/hooks/useFarcasterIdentity';
// Realtime-only: snapshots removed
import { DEV_FID } from '@/lib/constants';
import { stHasEnteredBefore } from '@/lib/spacetime/api';
import { sdk } from "@farcaster/miniapp-sdk";
import { useAddMiniApp } from "@/hooks/useAddMiniApp";
import { useQuickAuth } from "@/hooks/useQuickAuth";
import { useIsInFarcaster } from "@/hooks/useIsInFarcaster";

export default function HomePage(): JSX.Element {
  const { addMiniApp } = useAddMiniApp();
  const isInFarcaster = useIsInFarcaster();
  useQuickAuth(isInFarcaster);
  const isDevEnv = process.env.NODE_ENV === 'development';
  
  const [showTutorial, setShowTutorial] = useState<boolean>(false);

  // Check if first time user
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
    if (!hasSeenTutorial) {
      setShowTutorial(true);
    }
  }, []);

  const handleTutorialComplete = (): void => {
    localStorage.setItem('hasSeenTutorial', 'true');
    setShowTutorial(false);
  };

  const handleTutorialSkip = (): void => {
    localStorage.setItem('hasSeenTutorial', 'true');
    setShowTutorial(false);
  };

  // Single SDK initialization with retry logic
  useEffect(() => {
    const initializeFarcaster = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (document.readyState !== 'complete') {
          await new Promise<void>(resolve => {
            if (document.readyState === 'complete') {
              resolve();
            } else {
              window.addEventListener('load', () => resolve(), { once: true });
            }
          });
        }

        await sdk.actions.ready();
        await addMiniApp();
        console.log('Farcaster SDK initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Farcaster SDK:', error);
        
        setTimeout(async () => {
          try {
            await sdk.actions.ready();
            await addMiniApp();
            console.log('Farcaster SDK initialized on retry');
          } catch (retryError) {
            console.error('Farcaster SDK retry failed:', retryError);
          }
        }, 1000);
      }
    };

    initializeFarcaster();
  }, [addMiniApp]);

  // Farcaster SDK initialization complete
  const { identity, isLoading: identityLoading } = useFarcasterIdentity();
  // Snapshots removed; meta/clubs will be provided by realtime APIs in future
  const meta: any = null;
  const clubs: any = null;
  const [hasEnteredBefore, setHasEnteredBefore] = useState<boolean>(false);
  
  // Check if user has entered before
  useEffect(() => {
    if (!identity?.fid) return;
    stHasEnteredBefore(identity.fid).then(setHasEnteredBefore).catch(console.error);
  }, [identity?.fid]);

  const userClub = identity && (clubs as any[])?.find((c: any) => c.fid === identity.fid);
  const isDev = identity?.fid === DEV_FID;

  // Mock data for charts
  const performanceData = [
    { week: 'W1', rating: 72, chemistry: 65, wins: 1 },
    { week: 'W2', rating: 75, chemistry: 70, wins: 2 },
    { week: 'W3', rating: 78, chemistry: 75, wins: 3 },
    { week: 'W4', rating: 76, chemistry: 73, wins: 3 },
    { week: 'W5', rating: 80, chemistry: 78, wins: 4 },
  ];

  const upcomingMatches = [
    { id: '1', opponent: 'FC Barcelona', date: 'Tomorrow', time: '19:00', venue: 'home' as const, competition: 'League', difficulty: 'hard' as const },
    { id: '2', opponent: 'Real Madrid', date: 'Sat, Dec 2', time: '15:00', venue: 'away' as const, competition: 'Cup', difficulty: 'hard' as const },
    { id: '3', opponent: 'Ajax FC', date: 'Wed, Dec 6', time: '20:00', venue: 'home' as const, competition: 'League', difficulty: 'medium' as const },
  ];

  return (
    <>
      {showTutorial && (
        <OnboardingFlow 
          onComplete={handleTutorialComplete}
          onSkip={handleTutorialSkip}
        />
      )}
      <DesktopNav />
      <div className="min-h-screen mobile-safe md:pt-20 pb-20 md:pb-8">
        <div className="container mx-auto px-4 py-6 max-w-4xl animate-fadeIn">
          {/* Hero Section with Championship styling */}
          <div className="text-center mb-8 animate-slideInLeft">
            <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full mb-4 animate-glow">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">
                Live
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl championship-title mb-4 tracking-tight">
              ⚽ Football Caster
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Build your dream team on <span className="font-bold text-emerald-500">Base</span>. Trade players, compete, and dominate the leaderboard.
            </p>

            {identityLoading ? (
              <div className="glass-skeleton h-12 w-48 mx-auto rounded-lg" />
            ) : identity ? (
              <div className="flex flex-col items-center gap-3">
                <div className="text-sm text-muted-foreground">
                  Welcome back,{' '}
                  <span className="font-bold text-foreground">
                    {identity.username || `FID ${identity.fid}`}
                  </span>
                  {isDev && <span className="dev-badge ml-2">DEV</span>}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href="/match">
                    <Button size="lg" variant="outline" className="gap-2 h-14 text-lg border-2 border-emerald-500/30 hover:bg-emerald-500/10">
                      ⚽ Watch Match
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Loading identity...
              </div>
            )}
          </div>

          {/* Starter Pack Card */}
          <StarterPackCard />

          {/* Status Cards with Championship styling */}
          {userClub && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-slideInRight">
              <GlassCard className="championship-card match-day-glow">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Trophy className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Team Rating</div>
                    <div className="text-2xl font-bold">{userClub.chemistry || 0}</div>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="championship-card match-day-glow">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Squad Size</div>
                    <div className="text-2xl font-bold">
                      {userClub.lineup.length + userClub.subs.length}
                    </div>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="championship-card match-day-glow">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Formation</div>
                    <div className="text-2xl font-bold">{userClub.formation}</div>
                  </div>
                </div>
              </GlassCard>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
            <GlassCard hover className="cursor-pointer championship-card">
              <Link href="/market" className="flex items-center gap-4 p-2">
                <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                  <ShoppingBag className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">Player Market</h3>
                  <p className="text-sm text-muted-foreground">
                    Browse and trade players at weekly market prices
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </Link>
            </GlassCard>

            <GlassCard hover className="cursor-pointer championship-card">
              <Link href="/auction" className="flex items-center gap-4 p-2">
                <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                  <Gavel className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">Auctions</h3>
                  <p className="text-sm text-muted-foreground">
                    Bid on players or create your own auctions
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </Link>
            </GlassCard>
          </div>

          {/* Features */}
          <div className="mt-8 animate-fadeIn">
            <h2 className="text-3xl font-bold mb-6 championship-title">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <GlassCard>
                <div className="flex flex-col items-center text-center p-2">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <span className="text-2xl font-bold text-primary">1</span>
                  </div>
                  <h3 className="font-bold mb-2">Enter & Get Started</h3>
                  <p className="text-sm text-muted-foreground">
                    Pay $1 in FBC and receive your starter pack of 15 tradable players
                  </p>
                </div>
              </GlassCard>

              <GlassCard>
                <div className="flex flex-col items-center text-center p-2">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <span className="text-2xl font-bold text-primary">2</span>
                  </div>
                  <h3 className="font-bold mb-2">Build Your Squad</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose formation, hire coaches, and trade players to build chemistry
                  </p>
                </div>
              </GlassCard>

              <GlassCard>
                <div className="flex flex-col items-center text-center p-2">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <span className="text-2xl font-bold text-primary">3</span>
                  </div>
                  <h3 className="font-bold mb-2">Trade & Compete</h3>
                  <p className="text-sm text-muted-foreground">
                    Trade on the market or auctions. Climb the leaderboard and dominate
                  </p>
                </div>
              </GlassCard>
            </div>
          </div>

          {/* Key Features */}
          <div className="mt-8">
            <GlassCard>
              <h3 className="font-bold text-lg mb-4">Key Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <StatPill label="Entry Fee" value="$1 FBC" variant="info" />
                <StatPill label="Starter Players" value="15" variant="success" />
                <StatPill label="Hold Period" value="7 days" variant="warning" />
                <StatPill label="Market Fee" value="2%" variant="default" />
                <StatPill label="Auction Duration" value="48h" variant="info" />
                <StatPill label="Chain" value="Base" variant="success" />
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Dashboard Section (dev only) */}
        {isDevEnv && (
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PerformanceChart data={performanceData} />
            <UpcomingMatches matches={upcomingMatches} />
          </div>
        )}
      </div>
      <Navigation />
    </>
  );
}
