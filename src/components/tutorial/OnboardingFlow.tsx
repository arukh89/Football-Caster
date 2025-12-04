'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  image: string;
  action?: string;
}

interface OnboardingFlowProps {
  onComplete: () => void;
  onSkip: () => void;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Football Caster! ⚽',
    description: 'Build your dream team, manage tactics, and compete against other managers in this blockchain-powered football management game.',
    image: '🏆',
    action: 'Get Started',
  },
  {
    id: 'squad',
    title: 'Build Your Squad 👥',
    description: 'Collect players, manage formations, and optimize chemistry. Drag and drop players to adjust your lineup anytime.',
    image: '⚽',
    action: 'Learn More',
  },
  {
    id: 'tactics',
    title: 'Master Tactics 🎯',
    description: 'Adjust mentality, tempo, width, and pressing in real-time during matches. Every decision impacts the outcome.',
    image: '📊',
    action: 'Continue',
  },
  {
    id: 'match',
    title: 'Live Match Simulation 🔴',
    description: 'Watch your team play in realistic 2D match simulations with dynamic commentary and weather effects.',
    image: '⚡',
    action: 'Continue',
  },
  {
    id: 'market',
    title: 'Transfer Market 💰',
    description: 'Buy, sell, and auction players using FBC tokens on Base blockchain. Build value through smart trading.',
    image: '🤝',
    action: 'Continue',
  },
  {
    id: 'ready',
    title: 'You\'re Ready! 🚀',
    description: 'Start with $1 entry fee, receive your starter pack of 15 players, and begin your journey to championship glory!',
    image: '🎉',
    action: 'Start Playing',
  },
];

export function OnboardingFlow({ onComplete, onSkip }: OnboardingFlowProps): JSX.Element {
  const [currentStep, setCurrentStep] = useState<number>(0);

  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;
  const step = tutorialSteps[currentStep];

  const handleNext = (): void => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = (): void => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div className="w-full max-w-2xl">
        <motion.div
          className="glass rounded-2xl p-8 championship-card relative overflow-hidden"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', duration: 0.5 }}
        >
          {/* Background Glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-teal-500/10 pointer-events-none" />

          {/* Close Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            className="absolute top-4 right-4 z-10"
            aria-label="Close tutorial"
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2 text-sm text-muted-foreground">
              <span>Step {currentStep + 1} of {tutorialSteps.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              {/* Icon/Image */}
              <div className="text-8xl mb-6 animate-bounce-slow">
                {step.image}
              </div>

              {/* Title */}
              <h2 className="text-3xl font-bold mb-4 championship-title">
                {step.title}
              </h2>

              {/* Description */}
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed max-w-xl mx-auto">
                {step.description}
              </p>

              {/* Navigation */}
              <div className="flex items-center justify-between gap-4">
                <Button
                  variant="outline"
                  onClick={handlePrev}
                  disabled={currentStep === 0}
                  className="gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <div className="flex gap-1">
                  {tutorialSteps.map((_, index) => (
                    <div
                      key={index}
                      className={`h-2 rounded-full transition-all ${
                        index === currentStep 
                          ? 'w-8 bg-emerald-500' 
                          : index < currentStep
                          ? 'w-2 bg-emerald-500/50'
                          : 'w-2 bg-gray-500/30'
                      }`}
                    />
                  ))}
                </div>

                <Button
                  onClick={handleNext}
                  className="championship-button gap-2"
                >
                  {currentStep === tutorialSteps.length - 1 ? (
                    <>
                      <Check className="h-4 w-4" />
                      {step.action}
                    </>
                  ) : (
                    <>
                      {step.action}
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>

              {/* Skip Link */}
              <button
                onClick={onSkip}
                className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip tutorial
              </button>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
}
