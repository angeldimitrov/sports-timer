/**
 * Timer Controls Component
 * 
 * Premium control interface with dynamic 2-button layout that eliminates inactive buttons.
 * Shows only relevant actions for each timer state with optimal space utilization.
 * 
 * Design Principles:
 * - Dynamic 2-button layout (70%/30% split) - no disabled buttons
 * - State-based rendering - only show actionable buttons
 * - Premium visual design with smooth transitions
 * - Mobile-first with large touch targets (48px height)
 * - Inline settings access without page navigation
 * - Fast transitions and micro-interactions (200ms)
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw,
 
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
  // Determine button configuration based on timer state
  const getButtonConfig = () => {
    if (timer.isRunning) {
      return {
        layout: 'split' as const,
        primary: {
          icon: Pause,
          label: 'Pause',
          action: timer.pause,
          color: 'bg-orange-600 hover:bg-orange-700',
          borderColor: 'border-orange-500/30',
        },
        secondary: {
          icon: Square,
          label: 'Stop',
          action: timer.stop,
          color: 'bg-red-600 hover:bg-red-700',
        }
      };
    }
    
    if (timer.isPaused) {
      return {
        layout: 'split' as const,
        primary: {
          icon: Play,
          label: 'Resume',
          action: timer.resume,
          color: 'bg-green-600 hover:bg-green-700',
          borderColor: 'border-green-500/30',
        },
        secondary: {
          icon: Square,
          label: 'Stop',
          action: timer.stop,
          color: 'bg-red-600 hover:bg-red-700',
        }
      };
    }
    
    if (timer.isCompleted) {
      return {
        layout: 'single' as const,
        primary: {
          icon: RotateCcw,
          label: 'Restart',
          action: timer.reset,
          color: 'bg-blue-600 hover:bg-blue-700',
          borderColor: 'border-blue-500/30',
        }
      };
    }
    
    // Default: IDLE state
    return {
      layout: 'single' as const,
      primary: {
        icon: Play,
        label: 'Start',
        action: timer.start,
        color: 'bg-green-600 hover:bg-green-700',
        borderColor: 'border-green-500/30',
      }
    };
  };

  const config = getButtonConfig();
  const PrimaryIcon = config.primary.icon;

  return (
    <div className={cn('', className)}>
      {/* Dynamic Two-Button Controls */}
      <div className={cn(
        'glass-dark rounded-xl p-3 shadow-premium',
        'ring-1 ring-white/5 border border-slate-600/30'
      )}>
        {/* Adaptive layout: Full-width for IDLE/COMPLETED, Split for RUNNING/PAUSED */}
        {config.layout === 'single' ? (
          /* Single full-width button for maximum accessibility */
          <motion.div
            key={config.primary.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <Button
              onClick={config.primary.action}
              disabled={!timer.isReady}
              className={cn(
                'w-full h-14 text-base font-bold',  // Larger for single button (56px)
                'text-white rounded-lg',
                config.primary.color,
                'shadow-lg hover:shadow-xl',
                'transition-all duration-200 ease-out',
                'relative overflow-hidden group',
                'ring-1 ring-white/10',
                config.primary.borderColor
              )}
              asChild
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                {/* Enhanced overlay effect for single button */}
                <div className="absolute inset-0 bg-gradient-to-t from-white/0 to-white/15 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                
                {/* Button content */}
                <PrimaryIcon className="w-5 h-5 mr-2" />
                {config.primary.label}
              </motion.button>
            </Button>
          </motion.div>
        ) : (
          /* Split layout for RUNNING/PAUSED states */
          <div className="flex gap-2">
            {/* Primary action button - 70% width */}
            <motion.div 
              className="flex-[7]"
              key={config.primary.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <Button
                onClick={config.primary.action}
                disabled={!timer.isReady}
                className={cn(
                  'w-full h-12 text-sm font-semibold',  // 48px for accessibility
                  'text-white rounded-lg',
                  config.primary.color,
                  'shadow-lg hover:shadow-xl',
                  'transition-all duration-200 ease-out',
                  'relative overflow-hidden group',
                  'ring-1 ring-white/10',
                  config.primary.borderColor
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
                  <PrimaryIcon className="w-4 h-4 mr-2" />
                  {config.primary.label}
                </motion.button>
              </Button>
            </motion.div>

            {/* Secondary action button - 30% width */}
            <motion.div 
              className="flex-[3]"
              key={config.secondary?.label || 'secondary'}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, ease: 'easeOut', delay: 0.05 }}
            >
              {config.secondary && (
                <Button
                  onClick={config.secondary.action}
                  variant="outline"
                  className={cn(
                    'w-full h-12 rounded-lg text-sm font-medium',  // 48px for accessibility
                    'glass border-slate-600/50',
                    'hover:bg-red-900/40 hover:border-red-500/50',
                    'text-slate-200 hover:text-white',
                    'transition-all duration-200 ease-out shadow-md'
                  )}
                >
                  <Square className="w-3.5 h-3.5 mr-1.5" />
                  {config.secondary.label}
                </Button>
              )}
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}