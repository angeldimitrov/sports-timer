/**
 * Preset Selector Component
 * 
 * Premium preset selection interface with visual indicators and smooth transitions.
 * Displays available workout presets with clear difficulty levels and configurations.
 * 
 * Design Principles:
 * - Clear visual hierarchy with difficulty indicators
 * - Informative preview of preset configurations
 * - Smooth selection animations and state changes
 * - Accessible design with keyboard navigation
 * - Responsive layout for all screen sizes
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Users, Target, Check } from 'lucide-react';
import { TimerConfig } from '@/lib/timer-engine';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PresetSelectorProps {
  /** Current timer configuration */
  currentConfig: TimerConfig;
  /** Callback when preset is selected */
  onPresetSelect: (preset: 'beginner' | 'intermediate' | 'advanced') => void;
  /** Whether selection is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// Preset configurations
const presets = {
  beginner: {
    id: 'beginner',
    name: 'Beginner',
    rounds: 3,
    workDuration: 120, // 2 minutes
    restDuration: 60,  // 1 minute
    color: 'from-green-500 to-emerald-600',
    icon: Users,
    difficulty: 1,
    totalTime: '9 min',
  },
  intermediate: {
    id: 'intermediate',
    name: 'Intermediate',
    rounds: 5,
    workDuration: 180, // 3 minutes
    restDuration: 60,  // 1 minute
    color: 'from-blue-500 to-indigo-600',
    icon: Dumbbell,
    difficulty: 2,
    totalTime: '20 min',
  },
  advanced: {
    id: 'advanced',
    name: 'Advanced',
    rounds: 12,
    workDuration: 180, // 3 minutes
    restDuration: 60,  // 1 minute
    color: 'from-purple-500 to-pink-600',
    icon: Target,
    difficulty: 3,
    totalTime: '48 min',
  },
} as const;

/**
 * Premium preset selector with sophisticated design
 * 
 * Features:
 * - Visual difficulty indicators with stars
 * - Detailed preset information display
 * - Selection state with check marks
 * - Hover effects and micro-interactions
 * - Disabled state for active workouts
 * - Smooth transitions between selections
 */
export function PresetSelector({ 
  currentConfig, 
  onPresetSelect, 
  disabled = false,
  className 
}: PresetSelectorProps) {
  // Check if a preset matches current config
  const isPresetActive = (preset: typeof presets[keyof typeof presets]) => {
    return (
      currentConfig.totalRounds === preset.rounds &&
      currentConfig.workDuration === preset.workDuration &&
      currentConfig.restDuration === preset.restDuration
    );
  };

  // Get currently active preset
  const activePreset = Object.values(presets).find(preset => isPresetActive(preset));

  return (
    <div className={cn('space-y-4', className)}>
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
        <div className="space-y-3">
          {Object.entries(presets).map(([key, preset]) => {
            const Icon = preset.icon;
            const isActive = isPresetActive(preset);
            const presetKey = key as 'beginner' | 'intermediate' | 'advanced';

            return (
              <motion.div
                key={preset.id}
                className="w-full"
              >
                <Button
                  onClick={() => onPresetSelect(presetKey)}
                  disabled={disabled}
                  variant="ghost"
                  className={cn(
                    'w-full min-h-[92px] p-4',
                    'bg-slate-900/50 hover:bg-slate-800/50',
                    'border border-slate-700/50 hover:border-slate-600',
                    'text-slate-200 hover:text-white',
                    'transition-all duration-300 ease-out',
                    'relative overflow-hidden group',
                    'hover:shadow-lg hover:shadow-slate-900/25',
                    'active:bg-slate-800/70',
                    isActive && 'ring-2 ring-offset-2 ring-offset-slate-900',
                    isActive && preset.id === 'beginner' && 'ring-green-500',
                    isActive && preset.id === 'intermediate' && 'ring-blue-500',
                    isActive && preset.id === 'advanced' && 'ring-purple-500',
                    disabled && 'cursor-not-allowed opacity-50'
                  )}
                >
                  {/* Premium gradient background on hover */}
                  <div
                    className={cn(
                      'absolute inset-0 bg-gradient-to-r opacity-0',
                      'group-hover:opacity-10 group-active:opacity-15',
                      'transition-opacity duration-300 ease-out',
                      preset.color
                    )}
                  />
                  
                  {/* Subtle shimmer effect on hover */}
                  <div
                    className={cn(
                      'absolute inset-0 opacity-0',
                      'group-hover:opacity-100 transition-opacity duration-500',
                      'bg-gradient-to-r from-transparent via-white/5 to-transparent',
                      'translate-x-[-100%] group-hover:translate-x-[100%]',
                      'transition-transform duration-1000 ease-out'
                    )}
                  />

                  <div className="relative z-10 flex items-start gap-4 text-left">
                    {/* Icon with gradient background and enhanced visual feedback */}
                    <div
                      className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center',
                        'bg-gradient-to-br shadow-lg',
                        'group-hover:shadow-xl transition-shadow duration-300',
                        'ring-1 ring-white/10 group-hover:ring-white/20',
                        preset.color
                      )}
                    >
                      <Icon className="w-6 h-6 text-white drop-shadow-sm" />
                    </div>

                    {/* Preset details */}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-white">
                          {preset.name}
                        </h4>
                        
                        {/* Active indicator - Fixed size container */}
                        <div className="w-6 h-6 flex items-center justify-center">
                          <AnimatePresence mode="wait">
                            {isActive && (
                              <motion.div
                                key={`active-${preset.id}`}
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                className={cn(
                                  'w-6 h-6 rounded-full flex items-center justify-center',
                                  'bg-gradient-to-br shadow-lg',
                                  preset.color
                                )}
                              >
                                <Check className="w-4 h-4 text-white" strokeWidth={3} />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      {/* Preset stats */}
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>{preset.rounds} rounds</span>
                        <span>•</span>
                        <span>{preset.totalTime}</span>
                      </div>

                      {/* Difficulty indicator */}
                      <div className="flex items-center gap-1 pt-1">
                        {[...Array(3)].map((_, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ 
                              opacity: i < preset.difficulty ? 1 : 0.2,
                              scale: 1 
                            }}
                            transition={{ delay: i * 0.1 }}
                            className={cn(
                              'w-4 h-4 rounded-sm',
                              i < preset.difficulty ? 'bg-gradient-to-br' : 'bg-slate-700',
                              i < preset.difficulty && preset.color
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* Current configuration display if custom - Only visible when needed */}
        <AnimatePresence mode="wait">
          {!activePreset && (
            <motion.div
              key="custom-config"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ 
                duration: 0.3, 
                ease: "easeInOut",
                height: { duration: 0.3 }
              }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <div className="text-sm text-slate-400">
                  <p className="font-medium mb-1">Custom Configuration</p>
                  <div className="flex items-center gap-3 text-xs">
                    <span>{currentConfig.totalRounds} rounds</span>
                    <span>•</span>
                    <span>{currentConfig.workDuration}s work</span>
                    <span>•</span>
                    <span>{currentConfig.restDuration}s rest</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}