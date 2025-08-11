/**
 * Timer Controls Component
 * 
 * Premium control interface for timer operations with sophisticated animations and haptic feedback.
 * Features touch-friendly buttons with visual states and smooth micro-interactions.
 * 
 * Design Principles:
 * - Compact single-row layout for space efficiency
 * - Touch-friendly targets (48px height) for mobile accessibility
 * - Clear visual feedback with color states and animations
 * - Intuitive icon usage with text labels
 * - Fast transitions and hover effects (200ms)
 * - Consistent spacing and alignment
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw 
} from 'lucide-react';
import { UseTimerReturn } from '@/hooks/use-timer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TimerControlsProps {
  /** Timer hook instance */
  timer: UseTimerReturn;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Premium timer controls with sophisticated design
 * 
 * Features:
 * - Primary action buttons (Start/Pause/Stop/Reset)
 * - Volume control with visual feedback
 * - Settings access button
 * - Responsive layout with mobile optimization
 * - Smooth animations and transitions
 * - Haptic feedback triggers (via CSS)
 */

export function TimerControls({ timer, className }: TimerControlsProps) {
  // Determine primary action based on timer state
  const getPrimaryAction = () => {
    if (timer.isRunning) return 'pause';
    if (timer.isPaused) return 'resume';
    if (timer.isCompleted) return 'reset';
    return 'start';
  };

  const primaryAction = getPrimaryAction();

  // Handle primary button click
  const handlePrimaryClick = async () => {
    switch (primaryAction) {
      case 'start':
        timer.start();
        break;
      case 'pause':
        timer.pause();
        break;
      case 'resume':
        timer.resume();
        break;
      case 'reset':
        timer.reset();
        break;
    }
  };

  // Button configurations for different states - more compact colors
  const primaryButtonConfig = {
    start: {
      icon: Play,
      label: 'Start',
      color: 'bg-green-600 hover:bg-green-700',
      borderColor: 'border-green-500/30',
    },
    pause: {
      icon: Pause,
      label: 'Pause',
      color: 'bg-orange-600 hover:bg-orange-700',
      borderColor: 'border-orange-500/30',
    },
    resume: {
      icon: Play,
      label: 'Resume',
      color: 'bg-green-600 hover:bg-green-700',
      borderColor: 'border-green-500/30',
    },
    reset: {
      icon: RotateCcw,
      label: 'Reset',
      color: 'bg-blue-600 hover:bg-blue-700',
      borderColor: 'border-blue-500/30',
    },
  };

  const config = primaryButtonConfig[primaryAction];
  const Icon = config.icon;

  return (
    <div className={cn('', className)}>
      {/* Compact Controls - Single Row */}
      <div className={cn(
        'glass-dark rounded-xl p-3 shadow-premium',
        'ring-1 ring-white/5 border border-slate-600/30'
      )}>
        {/* Single row control buttons */}
        <div className="flex gap-2">
          {/* Primary action button - flex-[2] for 40% width */}
          <motion.div className="flex-[2]">
            <Button
              onClick={handlePrimaryClick}
              disabled={!timer.isReady}
              className={cn(
                'w-full h-12 text-sm font-semibold',  // 48px for accessibility
                'text-white rounded-lg',
                config.color,
                'shadow-lg hover:shadow-xl',
                'transition-all duration-200 ease-out',
                'relative overflow-hidden group',
                'ring-1 ring-white/10',
                config.borderColor
              )}
              asChild
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                {/* Subtle overlay effect */}
                <div className="absolute inset-0 bg-gradient-to-t from-white/0 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                
                {/* Button content */}
                <Icon className="w-4 h-4 mr-1.5" />
                {config.label}
              </motion.button>
            </Button>
          </motion.div>

          {/* Stop button - flex-[1.5] for 30% width */}
          <motion.div className="flex-[1.5]">
            <Button
              onClick={() => timer.stop()}
              variant="outline"
              disabled={!(timer.isRunning || timer.isPaused)}
              className={cn(
                'w-full h-12 rounded-lg text-sm font-medium',  // 48px for accessibility
                'glass border-slate-600/50',
                'hover:bg-red-900/40 hover:border-red-500/50',
                'text-slate-200 hover:text-white',
                'transition-all duration-200 ease-out shadow-md',
                'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-slate-600/50'
              )}
            >
              <Square className="w-3.5 h-3.5 mr-1.5" />
              Stop
            </Button>
          </motion.div>

          {/* Reset button - flex-[1.5] for 30% width */}
          <motion.div className="flex-[1.5]">
            <Button
              onClick={() => timer.reset()}
              disabled={timer.isIdle || !timer.isReady}
              variant="outline"
              className={cn(
                'w-full h-12 rounded-lg text-sm font-medium',  // 48px for accessibility
                'glass border-slate-600/50',
                'hover:bg-blue-900/40 hover:border-blue-500/50',
                'text-slate-200 hover:text-white',
                'transition-all duration-200 ease-out shadow-md',
                'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-slate-600/50'
              )}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Reset
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}