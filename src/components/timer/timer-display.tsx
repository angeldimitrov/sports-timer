/**
 * Timer Display Component
 * 
 * Large, premium countdown display with sophisticated visual design and smooth animations.
 * Features a bold digital clock style with dynamic color states and micro-interactions.
 * 
 * Design Principles:
 * - Minimum 48px font size for distance readability
 * - High contrast ratios for visibility during workouts
 * - Smooth transitions between work/rest phases
 * - Subtle animations for visual feedback
 * - Premium gradient effects and shadow layering
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UseTimerReturn } from '@/hooks/use-timer';
import { cn } from '@/lib/utils';

interface TimerDisplayProps {
  /** Timer hook instance */
  timer: UseTimerReturn;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Premium timer display with sophisticated visual design
 * 
 * Features:
 * - Large digital clock display with custom typography
 * - Dynamic color states for work (red) and rest (blue) phases
 * - Smooth phase transitions with gradient animations
 * - Progress ring visualization with animated strokes
 * - Round counter with elegant typography
 * - Warning state animations at 10 seconds
 * - Micro-interactions on state changes
 */
export function TimerDisplay({ timer, className }: TimerDisplayProps) {
  const [lastPhase, setLastPhase] = useState(timer.state.phase);
  const [isPhaseTransition, setIsPhaseTransition] = useState(false);

  // Detect phase transitions for animations
  useEffect(() => {
    if (timer.state.phase !== lastPhase) {
      setIsPhaseTransition(true);
      setLastPhase(timer.state.phase);
      
      // Reset transition state after animation
      const timeout = setTimeout(() => setIsPhaseTransition(false), 600);
      return () => clearTimeout(timeout);
    }
  }, [timer.state.phase, lastPhase]);

  // Color schemes for different phases
  const phaseColors = {
    preparation: {
      primary: 'from-purple-500 to-indigo-600',
      secondary: 'from-purple-600/20 to-indigo-700/20',
      text: 'text-purple-50',
      ring: 'stroke-purple-500',
      glow: 'shadow-purple-500/30',
    },
    work: {
      primary: 'from-red-500 to-rose-600',
      secondary: 'from-red-600/20 to-rose-700/20',
      text: 'text-red-50',
      ring: 'stroke-red-500',
      glow: 'shadow-red-500/30',
    },
    rest: {
      primary: 'from-blue-500 to-cyan-600',
      secondary: 'from-blue-600/20 to-cyan-700/20',
      text: 'text-blue-50',
      ring: 'stroke-blue-500',
      glow: 'shadow-blue-500/30',
    },
  };

  const currentColors = phaseColors[timer.state.phase];
  const isWarning = timer.state.warningTriggered && timer.state.timeRemaining <= 10000;

  // Calculate progress for enhanced ring animation
  const progressPercentage = timer.state.progress * 100;
  const strokeDasharray = 2 * Math.PI * 42; // radius = 42 for better visual balance
  const strokeDashoffset = strokeDasharray - (progressPercentage / 100) * strokeDasharray;

  return (
    <div className={cn('relative', className)}>
      {/* Background gradient card */}
      <motion.div
        className={cn(
          'relative overflow-hidden rounded-3xl p-6 sm:p-8 md:p-12 lg:p-16',
          'bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95',
          'border border-slate-600/30',
          'shadow-[0_0_60px_rgba(0,0,0,0.8)] backdrop-blur-sm',
          'ring-1 ring-white/5'
        )}
        animate={{
          scale: isPhaseTransition ? 1.02 : 1,
        }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 20,
        }}
      >
        {/* Animated gradient overlay */}
        <motion.div
          className={cn(
            'absolute inset-0 opacity-30',
            'bg-gradient-to-br',
            currentColors.secondary
          )}
          initial={{
            opacity: 0.3,
          }}
          animate={{
            opacity: isPhaseTransition ? 0.5 : 0.3,
          }}
          transition={{ duration: 0.6 }}
        />

        {/* Phase indicator - Enhanced and more prominent */}
        <AnimatePresence mode="wait">
          <motion.div
            key={timer.state.phase}
            initial={{ opacity: 0, y: -30, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.8 }}
            transition={{ 
              type: 'spring', 
              stiffness: 200, 
              damping: 20,
              duration: 0.6 
            }}
            className="relative z-10 text-center mb-6 sm:mb-8 md:mb-12"
          >
            <motion.h2 
              className={cn(
                'text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-[0.2em]',
                'bg-gradient-to-r bg-clip-text text-transparent',
                currentColors.primary,
                'drop-shadow-lg'
              )}
              animate={{
                textShadow: isPhaseTransition 
                  ? `0 0 40px ${timer.state.phase === 'preparation' ? 'rgba(147, 51, 234, 0.8)' :
                                timer.state.phase === 'work' ? 'rgba(239, 68, 68, 0.8)' : 'rgba(59, 130, 246, 0.8)'}` 
                  : 'none'
              }}
            >
              {timer.state.phase === 'preparation' ? 'GET READY' : 
               timer.state.phase === 'work' ? 'WORK' : 'REST'}
            </motion.h2>
            
            {/* Subtle accent line */}
            <motion.div 
              className={cn(
                'w-24 h-1 mx-auto mt-4 rounded-full',
                'bg-gradient-to-r',
                currentColors.primary
              )}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            />
          </motion.div>
        </AnimatePresence>

        {/* Main timer display with progress ring */}
        <div className="relative z-10 flex items-center justify-center">
          {/* Enhanced progress ring SVG with multiple layers */}
          <svg
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Outer glow ring */}
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className={cn(currentColors.ring, 'opacity-10 blur-sm')}
            />
            
            {/* Background ring */}
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-slate-600/40"
            />
            
            {/* Main progress ring */}
            <motion.circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              strokeWidth="3"
              strokeLinecap="round"
              className={cn(currentColors.ring, 'transition-colors duration-600 drop-shadow-lg')}
              strokeDasharray={strokeDasharray}
              style={{
                filter: `drop-shadow(0 0 8px ${timer.state.phase === 'work' ? 'rgba(239, 68, 68, 0.6)' : 'rgba(59, 130, 246, 0.6)'})`
              }}
              initial={{
                strokeDashoffset: strokeDasharray,
                opacity: 0.5,
              }}
              animate={{
                strokeDashoffset,
                opacity: timer.isRunning ? 1 : 0.6,
              }}
              transition={{
                strokeDashoffset: { type: 'spring', stiffness: 60, damping: 18 },
                opacity: { duration: 0.4 },
              }}
            />
          </svg>

          {/* Time display */}
          <div className="relative">
            <motion.div
              className={cn(
                'text-7xl sm:text-8xl md:text-9xl lg:text-[12rem] xl:text-[14rem] font-timer font-black',
                'tabular-nums tracking-tighter leading-none',
                currentColors.text,
                'drop-shadow-[0_8px_32px_rgba(0,0,0,0.8)]',
                'filter brightness-110',
                isWarning && 'animate-pulse'
              )}
              animate={{
                scale: isWarning ? [1, 1.05, 1] : 1,
              }}
              transition={{
                repeat: isWarning ? Infinity : 0,
                duration: 1,
              }}
            >
              {timer.formattedTimeRemaining}
            </motion.div>

          </div>
        </div>

        {/* Round counter - Enhanced design */}
        <div className="relative z-10 mt-6 sm:mt-8 md:mt-12 text-center">
          <motion.div
            className={cn(
              'inline-flex items-center gap-3 px-6 py-3 rounded-2xl',
              'bg-gradient-to-r from-slate-800/60 via-slate-700/40 to-slate-800/60',
              'backdrop-blur-md border border-slate-600/30',
              'shadow-[0_8px_32px_rgba(0,0,0,0.4)]',
              'ring-1 ring-white/5'
            )}
            whileHover={{ 
              scale: 1.05,
              boxShadow: '0 12px 40px rgba(0,0,0,0.6)'
            }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <span className="text-slate-300 text-base font-semibold tracking-wide">Round</span>
            <motion.span 
              className={cn(
                'text-3xl sm:text-4xl font-timer font-black tabular-nums',
                'bg-gradient-to-r bg-clip-text text-transparent',
                currentColors.primary,
                'drop-shadow-sm'
              )}
              key={timer.state.currentRound}
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            >
              {timer.state.currentRound}
            </motion.span>
            <span className="text-slate-300 text-base font-semibold tracking-wide">of {timer.config.totalRounds}</span>
          </motion.div>
        </div>

        {/* Enhanced status indicator */}
        <div className="absolute top-6 right-6">
          <motion.div
            className={cn(
              'w-4 h-4 rounded-full ring-2 ring-white/20',
              timer.isRunning && 'animate-pulse'
            )}
            animate={{
              backgroundColor: timer.isRunning 
                ? timer.isWorkPhase ? '#ef4444' : '#3b82f6'
                : timer.isCompleted ? '#10b981' : '#64748b',
              boxShadow: timer.isRunning
                ? timer.isWorkPhase 
                  ? '0 0 24px rgba(239, 68, 68, 0.8), 0 0 8px rgba(239, 68, 68, 0.4)'
                  : '0 0 24px rgba(59, 130, 246, 0.8), 0 0 8px rgba(59, 130, 246, 0.4)'
                : timer.isCompleted
                  ? '0 0 16px rgba(16, 185, 129, 0.6)'
                  : 'none',
              scale: timer.isRunning ? [1, 1.2, 1] : 1
            }}
            transition={{
              scale: {
                repeat: timer.isRunning ? Infinity : 0,
                duration: 2,
                ease: 'easeInOut'
              }
            }}
          />
        </div>

        {/* Enhanced decorative elements */}
        <div className="absolute top-0 left-0 w-48 h-48 bg-gradient-to-br from-white/8 via-white/3 to-transparent rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-tl from-white/8 via-white/3 to-transparent rounded-full blur-3xl opacity-60" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-radial from-transparent via-white/1 to-transparent rounded-full blur-3xl" />
        
        {/* Subtle noise texture overlay */}
        <div className="absolute inset-0 opacity-[0.015] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxmaWx0ZXIgaWQ9Im5vaXNlIj4KICAgICAgPGZlVHVyYnVsZW5jZSBiYXNlRnJlcXVlbmN5PSIwLjkiIG51bU9jdGF2ZXM9IjQiIHNlZWQ9IjEiLz4KICAgIDwvZmlsdGVyPgogICAgPHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI25vaXNlKSIgb3BhY2l0eT0iMC4yIi8+CiAgPC9kZWZzPgo8L3N2Zz4K')] pointer-events-none" />
      </motion.div>

      {/* Phase transition effect */}
      <AnimatePresence>
        {isPhaseTransition && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className={cn(
              'absolute inset-0 rounded-3xl',
              'bg-gradient-to-br',
              currentColors.primary,
              'pointer-events-none'
            )}
          />
        )}
      </AnimatePresence>
    </div>
  );
}