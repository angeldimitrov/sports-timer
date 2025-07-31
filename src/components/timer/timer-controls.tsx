/**
 * Timer Controls Component
 * 
 * Premium control interface for timer operations with sophisticated animations and haptic feedback.
 * Features touch-friendly buttons with visual states and smooth micro-interactions.
 * 
 * Design Principles:
 * - Large touch targets (minimum 48px) for mobile accessibility
 * - Clear visual feedback with color states and animations
 * - Intuitive icon usage with text labels
 * - Smooth transitions and hover effects
 * - Consistent spacing and alignment
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createModuleLogger } from '@/lib/logger';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Volume2, 
  VolumeX,
  Settings
} from 'lucide-react';
import { UseTimerReturn } from '@/hooks/use-timer';
import { UseAudioReturn } from '@/hooks/use-audio';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface TimerControlsProps {
  /** Timer hook instance */
  timer: UseTimerReturn;
  /** Audio hook instance */
  audio: UseAudioReturn;
  /** Callback for opening settings */
  onSettingsClick?: () => void;
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
const log = createModuleLogger('TimerControls');

export function TimerControls({ timer, audio, onSettingsClick, className }: TimerControlsProps) {
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
        // Initialize audio on first user interaction
        if (!audio.isInitialized) {
          try {
            await audio.initialize();
          } catch (error) {
            log.warn('Audio initialization failed, continuing without audio:', error);
          }
        }
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

  // Button configurations for different states
  const primaryButtonConfig = {
    start: {
      icon: Play,
      label: 'Start',
      color: 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700',
      shadowColor: 'shadow-green-500/25',
    },
    pause: {
      icon: Pause,
      label: 'Pause',
      color: 'bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700',
      shadowColor: 'shadow-yellow-500/25',
    },
    resume: {
      icon: Play,
      label: 'Resume',
      color: 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700',
      shadowColor: 'shadow-green-500/25',
    },
    reset: {
      icon: RotateCcw,
      label: 'Reset',
      color: 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700',
      shadowColor: 'shadow-blue-500/25',
    },
  };

  const config = primaryButtonConfig[primaryAction];
  const Icon = config.icon;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Primary Controls */}
      <div className={cn(
        'glass-dark rounded-2xl p-6 shadow-premium-lg',
        'ring-1 ring-white/5 border border-slate-600/30'
      )}>

        {/* Main control buttons */}
        <div className="grid grid-cols-2 gap-3">
          {/* Primary action button - larger and more prominent */}
          <motion.div className="col-span-2">
            <Button
              onClick={handlePrimaryClick}
              disabled={!timer.isReady}
              className={cn(
                'w-full h-16 text-lg font-bold tracking-wide',
                'text-white border-0 rounded-xl',
                config.color,
                'shadow-premium-lg hover:shadow-premium-xl',
                config.shadowColor,
                'transition-all duration-300 ease-out',
                'relative overflow-hidden group ring-1 ring-white/10'
              )}
              asChild
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Enhanced button overlay effects */}
                <div className="absolute inset-0 bg-gradient-to-t from-white/0 via-white/5 to-white/15 opacity-0 group-hover:opacity-100 transition-all duration-300" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
                
                {/* Button content */}
                <Icon className="w-6 h-6 mr-2" />
                {config.label}
              </motion.button>
            </Button>
          </motion.div>

          {/* Secondary buttons */}
          <AnimatePresence mode="wait">
            {(timer.isRunning || timer.isPaused) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <Button
                  onClick={() => timer.stop()}
                  variant="outline"
                  className={cn(
                    'w-full h-12 rounded-xl',
                    'glass border-slate-600/50',
                    'hover:bg-red-900/30 hover:border-red-500/60 hover:shadow-red-500/20',
                    'text-slate-200 hover:text-white font-medium',
                    'transition-all duration-300 ease-out shadow-premium'
                  )}
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            animate={{
              opacity: timer.isIdle || timer.isCompleted ? 1 : 0.5,
            }}
          >
            <Button
              onClick={() => timer.reset()}
              disabled={timer.isIdle || !timer.isReady}
              variant="outline"
              className={cn(
                'w-full h-12 rounded-xl font-medium',
                'glass border-slate-600/50',
                'hover:bg-slate-700/50 hover:border-slate-500/70',
                'text-slate-200 hover:text-white',
                'transition-all duration-300 ease-out shadow-premium',
                'disabled:opacity-30 disabled:cursor-not-allowed'
              )}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Audio Controls */}
      <div className={cn(
        'glass-dark rounded-2xl p-6 shadow-premium-lg',
        'ring-1 ring-white/5 border border-slate-600/30'
      )}>
        {/* Volume slider with visual feedback */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => audio.toggleMute()}
              variant="ghost"
              size="icon"
              className={cn(
                'shrink-0 text-slate-300 hover:text-white',
                audio.isMuted && 'text-slate-500'
              )}
            >
              <AnimatePresence mode="wait">
                {audio.isMuted ? (
                  <motion.div
                    key="muted"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <VolumeX className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="unmuted"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <Volume2 className="w-5 h-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>

            <div className="flex-1">
              <Slider
                value={[audio.isMuted ? 0 : (audio.volume ?? 80)]}
                onValueChange={([value]) => {
                  if (typeof value === 'number' && !isNaN(value) && value >= 0 && value <= 100) {
                    audio.setVolume(value);
                    if (value > 0 && audio.isMuted) {
                      audio.setMuted(false);
                    }
                  }
                }}
                max={100}
                step={5}
                className="cursor-pointer"
              />
            </div>
          </div>

        </div>
      </div>

      {/* Settings Button */}
      {onSettingsClick && (
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            onClick={onSettingsClick}
            variant="outline"
            className={cn(
              'w-full h-12 rounded-xl font-medium',
              'glass border-slate-600/50',
              'hover:bg-slate-700/50 hover:border-slate-500/70',
              'text-slate-200 hover:text-white',
              'transition-all duration-300 ease-out shadow-premium',
              'ring-1 ring-white/5'
            )}
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </motion.div>
      )}
    </div>
  );
}