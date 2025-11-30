'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PlayCircle, Gift, ArrowRight, Zap, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/glass/GlassCard';
import { Navigation, DesktopNav } from '@/components/Navigation';
import { motion } from 'framer-motion';

export default function EntryPage(): JSX.Element {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState<boolean>(false);

  // Guard: disable demo route in non-development builds
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      router.replace('/');
    }
  }, [router]);

  const handleStartDemo = async (): Promise<void> => {
    setIsStarting(true);
    
    // Simulate loading for better UX
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Redirect to match page to test the game
    router.push('/match');
  };

  return (
    <>
      <DesktopNav />
      <div className="min-h-screen championship-gradient mobile-safe md:pt-20 pb-20 md:pb-8">
        <div className="container mx-auto px-4 py-6 max-w-2xl">
          {/* Header with Championship Manager styling */}
          <motion.div 
            className="text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 mb-6 shadow-2xl shadow-emerald-500/50 animate-glow">
              <PlayCircle className="h-12 w-12 text-white" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-4 championship-title">
              Demo Mode
            </h1>
            <p className="text-xl text-muted-foreground">
              Test the game instantly - no payment required!
            </p>
          </motion.div>

          {/* Demo Mode Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <GlassCard className="mb-6 border-2 border-yellow-500/30 championship-card">
              <div className="text-center py-8">
                <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/30 mb-4">
                  <Zap className="h-6 w-6 text-yellow-500" />
                  <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                    🎮 FREE DEMO ACCESS
                  </span>
                </div>
                <p className="text-muted-foreground mb-2">
                  Experience the full game without any wallet connection
                </p>
                <p className="text-sm text-muted-foreground">
                  Perfect for testing and exploring all features
                </p>
              </div>
            </GlassCard>
          </motion.div>

          {/* What You Get */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <GlassCard className="mb-6 championship-card">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Gift className="h-5 w-5 text-emerald-500" />
                Demo Features Include:
              </h3>
              <div className="space-y-4">
                <motion.div 
                  className="flex items-start gap-4 p-3 rounded-lg bg-gradient-to-r from-emerald-500/5 to-transparent border-l-4 border-emerald-500 transition-all hover:from-emerald-500/10"
                  whileHover={{ x: 5 }}
                >
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <span className="text-lg font-bold text-white">⚽</span>
                  </div>
                  <div>
                    <div className="font-bold text-lg">Live Match Simulation</div>
                    <div className="text-sm text-muted-foreground">
                      Watch realistic 2D football matches with dynamic commentary
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  className="flex items-start gap-4 p-3 rounded-lg bg-gradient-to-r from-blue-500/5 to-transparent border-l-4 border-blue-500 transition-all hover:from-blue-500/10"
                  whileHover={{ x: 5 }}
                >
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <span className="text-lg font-bold text-white">🎯</span>
                  </div>
                  <div>
                    <div className="font-bold text-lg">Real-time Tactics Control</div>
                    <div className="text-sm text-muted-foreground">
                      Change mentality, tempo, and pressing during matches
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  className="flex items-start gap-4 p-3 rounded-lg bg-gradient-to-r from-purple-500/5 to-transparent border-l-4 border-purple-500 transition-all hover:from-purple-500/10"
                  whileHover={{ x: 5 }}
                >
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Trophy className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-lg">Full Squad Management</div>
                    <div className="text-sm text-muted-foreground">
                      Drag-and-drop lineup editor with 6 formations
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  className="flex items-start gap-4 p-3 rounded-lg bg-gradient-to-r from-green-500/5 to-transparent border-l-4 border-green-500 transition-all hover:from-green-500/10"
                  whileHover={{ x: 5 }}
                >
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <span className="text-lg font-bold text-white">📊</span>
                  </div>
                  <div>
                    <div className="font-bold text-lg">Performance Dashboard</div>
                    <div className="text-sm text-muted-foreground">
                      Interactive charts and analytics for your team
                    </div>
                  </div>
                </motion.div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Demo Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <GlassCard className="mb-6 border-l-4 border-blue-500 championship-card">
              <h3 className="text-sm font-bold mb-3 text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <span className="text-lg">ℹ️</span>
                Demo Mode Info
              </h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  <span>No wallet connection needed</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  <span>All features unlocked for testing</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  <span>Weather effects and dynamic commentary included</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  <span>Perfect for exploring game mechanics</span>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Action Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Button
              size="lg"
              className="w-full gap-2 h-16 text-xl font-bold championship-button shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all duration-300 animate-pulse-slow"
              onClick={handleStartDemo}
              disabled={isStarting}
            >
              {isStarting ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <PlayCircle className="h-6 w-6" />
                  </motion.div>
                  Starting Demo...
                </>
              ) : (
                <>
                  <PlayCircle className="h-6 w-6" />
                  Start Demo Now!
                  <ArrowRight className="h-6 w-6" />
                </>
              )}
            </Button>
          </motion.div>

          {/* Championship Manager inspired footer note */}
          <motion.div 
            className="mt-8 text-center text-xs text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <p className="mb-1">⚽ Demo Mode - No Payment Required</p>
            <p>Experience the full Championship Manager simulation</p>
          </motion.div>
        </div>
      </div>
      <Navigation />
    </>
  );
}
