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

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Dumbbell, Users, Target, Settings, Plus } from 'lucide-react';
import { TimerConfig } from '@/lib/timer-engine';
import { getCustomPresetDisplayInfo } from '@/lib/custom-preset';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PresetSelectorProps {
  /** Current timer configuration */
  currentConfig: TimerConfig;
  /** Currently selected preset (null during initialization) */
  selectedPreset?: 'beginner' | 'intermediate' | 'advanced' | 'custom' | null;
  /** Callback when preset is selected */
  onPresetSelect: (preset: 'beginner' | 'intermediate' | 'advanced' | 'custom') => void;
  /** Callback when custom preset edit is requested */
  onCustomPresetEdit?: () => void;
  /** Callback when custom preset creation is requested */
  onCustomPresetCreate?: () => void;
  /** Whether selection is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether preset data has finished loading */
  isInitialized?: boolean;
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
  selectedPreset,
  onPresetSelect, 
  onCustomPresetEdit,
  onCustomPresetCreate,
  disabled = false,
  className,
  isInitialized = true
}: PresetSelectorProps) {
  // Get custom preset info - avoid hydration mismatch by checking client-side only
  const [customPresetInfo, setCustomPresetInfo] = useState<{
    name: string;
    rounds: number;
    workDuration: number;
    restDuration: number;
    totalTime: string;
  } | null>(null);
  const [isCustomPresetLoaded, setIsCustomPresetLoaded] = useState(false);
  
  useEffect(() => {
    // Load custom preset info on client side
    setCustomPresetInfo(getCustomPresetDisplayInfo());
    setIsCustomPresetLoaded(true);
  }, []);

  // REMOVED ALL CONFIG MATCHING LOGIC - NO AUTO-SELECTION ALLOWED

  // FINAL FIX: Only show presets as active if explicitly selected by user
  // The key insight: default config matches Intermediate, but that doesn't mean it should show as "selected"
  // Preset selection should be explicit user choice, not automatic matching
  
  // Check if a preset is currently selected by the user
  const isStandardPresetActive = (preset: typeof presets[keyof typeof presets]) => {
    return selectedPreset === preset.id;
  };

  const isCustomPresetActive = selectedPreset === 'custom';

  // Don't render until both preset persistence and custom preset info are loaded
  if (!isInitialized || !isCustomPresetLoaded) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
          <div className="space-y-3">
            {/* Loading placeholders to prevent layout shift */}
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-full min-h-[92px] p-4 bg-slate-900/30 border border-slate-700/30 rounded-lg animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
        <div className="space-y-3">
          {Object.entries(presets).map(([key, preset]) => {
            const Icon = preset.icon;
            const isActive = isStandardPresetActive(preset);
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

          {/* Custom preset or Create Custom Preset option */}
          <motion.div
            key="custom-preset"
            className="w-full"
          >
            {customPresetInfo ? (
              /* Existing custom preset - Fixed layout without nested buttons */
              <div className="space-y-3">
                <Button
                  onClick={() => onPresetSelect('custom')}
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
                    isCustomPresetActive && 'ring-2 ring-offset-2 ring-offset-slate-900 ring-indigo-500',
                    disabled && 'cursor-not-allowed opacity-50'
                  )}
                >
                  {/* Premium gradient background on hover */}
                  <div
                    className={cn(
                      'absolute inset-0 bg-gradient-to-r opacity-0',
                      'group-hover:opacity-10 group-active:opacity-15',
                      'transition-opacity duration-300 ease-out',
                      'from-indigo-500 to-purple-600'
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
                    {/* Custom preset icon */}
                    <div
                      className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center',
                        'bg-gradient-to-br shadow-lg',
                        'group-hover:shadow-xl transition-shadow duration-300',
                        'ring-1 ring-white/10 group-hover:ring-white/20',
                        'from-indigo-500 to-purple-600'
                      )}
                    >
                      <Target className="w-6 h-6 text-white drop-shadow-sm" />
                    </div>

                    {/* Custom preset details */}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-white">
                            {customPresetInfo.name}
                          </h4>
                        </div>
                        
                      </div>

                      {/* Custom preset stats */}
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>{customPresetInfo.rounds} rounds</span>
                        <span>•</span>
                        <span>{customPresetInfo.totalTime}</span>
                      </div>

                      {/* Custom preset indicator */}
                      <div className="flex items-center gap-2 pt-1">
                        <div className="w-4 h-4 rounded-sm bg-gradient-to-br from-indigo-500 to-purple-600" />
                        <span className="text-xs text-indigo-400 font-medium">Your Custom Preset</span>
                      </div>
                    </div>
                  </div>
                </Button>
                
                {/* Mobile-friendly Edit button - Separate from main button to avoid nesting */}
                <button
                  onClick={() => onCustomPresetEdit?.()}
                  disabled={disabled}
                  className={cn(
                    // Mobile-first touch target sizing (48px minimum)
                    'w-full min-h-[48px] flex items-center justify-center gap-2',
                    // Enhanced visual design for mobile
                    'px-4 py-3 bg-slate-700/30 hover:bg-slate-600/50 active:bg-slate-600/70',
                    'border border-slate-600/30 hover:border-slate-500/50 active:border-slate-500',
                    'rounded-lg cursor-pointer transition-all duration-200',
                    // Touch feedback and visual states
                    'focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-900',
                    'hover:shadow-md active:shadow-sm active:scale-[0.98]',
                    // Text and icon styling
                    'text-slate-400 hover:text-white active:text-white',
                    'font-medium text-sm',
                    // Prevent text selection on mobile
                    'select-none',
                    // Disabled state
                    disabled && 'cursor-not-allowed opacity-50'
                  )}
                  // Accessibility improvements
                  aria-label="Edit custom preset settings"
                  type="button"
                >
                  <Settings className="w-4 h-4 transition-colors" />
                  <span>Edit Preset</span>
                </button>
              </div>
            ) : (
              /* Create Custom Preset option */
              <Button
                onClick={() => onCustomPresetCreate?.()}
                disabled={disabled}
                variant="ghost"
                className={cn(
                  'w-full min-h-[92px] p-4',
                  'bg-slate-900/50 hover:bg-slate-800/50',
                  'border border-slate-700/50 hover:border-slate-600',
                  'border-dashed',
                  'text-slate-200 hover:text-white',
                  'transition-all duration-300 ease-out',
                  'relative overflow-hidden group',
                  'hover:shadow-lg hover:shadow-slate-900/25',
                  disabled && 'cursor-not-allowed opacity-50'
                )}
              >
                {/* Premium gradient background on hover */}
                <div
                  className={cn(
                    'absolute inset-0 bg-gradient-to-r opacity-0',
                    'group-hover:opacity-10 group-active:opacity-15',
                    'transition-opacity duration-300 ease-out',
                    'from-indigo-500 to-purple-600'
                  )}
                />

                <div className="relative z-10 flex items-start gap-4 text-left">
                  {/* Create preset icon */}
                  <div
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center',
                      'bg-gradient-to-br shadow-lg',
                      'group-hover:shadow-xl transition-shadow duration-300',
                      'ring-1 ring-white/10 group-hover:ring-white/20',
                      'from-indigo-500 to-purple-600'
                    )}
                  >
                    <Plus className="w-6 h-6 text-white drop-shadow-sm" />
                  </div>

                  {/* Create preset details */}
                  <div className="flex-1 space-y-1">
                    <h4 className="font-semibold text-white">
                      Create Custom Preset
                    </h4>
                    
                    <p className="text-xs text-slate-500">
                      Configure your own workout settings
                    </p>
                    
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs text-indigo-400 font-medium">Tap to customize →</span>
                    </div>
                  </div>
                </div>
              </Button>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}