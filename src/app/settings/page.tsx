'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Timer, 
  Activity, 
  Coffee, 
  Info,
  Save,
  RotateCcw,
  ArrowLeft,
  Target
} from 'lucide-react';
import { TimerConfig } from '@/lib/timer-engine';
import { 
  createCustomPreset, 
  updateCustomPreset, 
  getCustomPreset,
  CustomPresetValidationError,
  CustomPresetStorageError
} from '@/lib/custom-preset';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// Configuration limits
const limits = {
  rounds: { min: 1, max: 20 },
  workDuration: { min: 10, max: 600 }, // 10 seconds to 10 minutes - step calculated dynamically
  restDuration: { min: 10, max: 300 }, // 10 seconds to 5 minutes - step calculated dynamically
  prepDuration: { min: 0, max: 60, step: 5 }, // 0-60 seconds in 5s increments
};

/**
 * Format seconds to display string
 * Handles both short durations (under 60s) and longer durations
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) {
    return `${minutes} min`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Settings Page Content Component
 * 
 * Full-screen settings page that now handles both general timer configuration
 * and custom preset creation/editing. The page mode is determined by URL parameters.
 * Features proper scrolling, back button navigation, and touch-friendly controls.
 */
function SettingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Determine if we're in custom preset mode
  const isCustomPresetMode = searchParams.get('mode') === 'custom-preset';
  const isEditingCustomPreset = isCustomPresetMode && searchParams.get('action') === 'edit';
  
  // Local state for editing
  const [localConfig, setLocalConfig] = useState<TimerConfig>({
    totalRounds: 5,
    workDuration: 180, // 3 minutes
    restDuration: 60,  // 1 minute
    enableWarning: true,
    prepDuration: 10,
  });
  const [presetName, setPresetName] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [originalConfig, setOriginalConfig] = useState<TimerConfig>(localConfig);
  const [originalPresetName, setOriginalPresetName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load configuration from localStorage on mount
  useEffect(() => {
    try {
      if (isCustomPresetMode) {
        // Custom preset mode - load custom preset if editing, or defaults if creating
        if (isEditingCustomPreset) {
          const customPreset = getCustomPreset();
          if (customPreset && customPreset.exists) {
            setLocalConfig(customPreset.config);
            setOriginalConfig(customPreset.config);
            setPresetName(customPreset.name);
            setOriginalPresetName(customPreset.name);
          } else {
            // No custom preset exists to edit - redirect to create mode
            router.replace('/settings?mode=custom-preset');
          }
        } else {
          // Creating new custom preset - start with default values
          setPresetName('My Custom Preset');
          setOriginalPresetName('');
        }
      } else {
        // Regular settings mode - load general timer config
        const saved = localStorage.getItem('boxing-timer-config');
        if (saved) {
          const config = JSON.parse(saved);
          setLocalConfig(config);
          setOriginalConfig(config);
        }
      }
    } catch (error) {
      console.warn('Failed to load saved config:', error);
      setError('Failed to load configuration');
    }
  }, [isCustomPresetMode, isEditingCustomPreset, router]);

  // Check if configuration has changed
  useEffect(() => {
    const configChanged = 
      localConfig.totalRounds !== originalConfig.totalRounds ||
      localConfig.workDuration !== originalConfig.workDuration ||
      localConfig.restDuration !== originalConfig.restDuration ||
      localConfig.enableWarning !== originalConfig.enableWarning ||
      (localConfig.prepDuration || 10) !== (originalConfig.prepDuration || 10);
    
    const nameChanged = isCustomPresetMode && presetName.trim() !== originalPresetName;
    
    setHasChanges(configChanged || nameChanged);
  }, [localConfig, originalConfig, presetName, originalPresetName, isCustomPresetMode]);

  // Handle save
  const handleSave = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      if (isCustomPresetMode) {
        // Save custom preset
        if (isEditingCustomPreset) {
          await updateCustomPreset(presetName.trim(), localConfig);
        } else {
          await createCustomPreset(presetName.trim(), localConfig);
        }
        
        setOriginalConfig(localConfig);
        setOriginalPresetName(presetName.trim());
        setHasChanges(false);
        
        // Navigate back to timer with custom preset selected
        router.push('/?preset=custom&updated=true');
      } else {
        // Save general timer config
        localStorage.setItem('boxing-timer-config', JSON.stringify(localConfig));
        setOriginalConfig(localConfig);
        setHasChanges(false);
        
        // Navigate back to timer with config update
        router.push('/?updated=true');
      }
    } catch (error) {
      console.error('Failed to save:', error);
      if (error instanceof CustomPresetValidationError) {
        setError(error.message);
      } else if (error instanceof CustomPresetStorageError) {
        setError('Failed to save custom preset. Please try again.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle reset
  const handleReset = () => {
    setLocalConfig(originalConfig);
    if (isCustomPresetMode) {
      setPresetName(originalPresetName);
    }
    setError(null);
  };

  // Handle back navigation
  const handleBack = () => {
    if (hasChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to go back?')) {
        router.push('/');
      }
    } else {
      router.push('/');
    }
  };

  // Calculate total workout time
  const totalWorkoutTime = () => {
    const totalSeconds = 
      (localConfig.prepDuration || 10) +
      (localConfig.workDuration * localConfig.totalRounds) +
      (localConfig.restDuration * (localConfig.totalRounds - 1));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 overflow-x-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800/20 via-transparent to-transparent" />
      <div className="absolute top-0 left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-red-500/5 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-full mx-auto px-3 sm:px-4 py-4 sm:py-6 sm:max-w-xl lg:max-w-2xl">
        {/* Header with back button */}
        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Button
            onClick={handleBack}
            variant="ghost"
            size="icon"
            className="text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 sm:gap-3">
              <div className={cn(
                "w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br flex items-center justify-center",
                isCustomPresetMode 
                  ? "from-indigo-500 to-purple-600" 
                  : "from-blue-500 to-indigo-600"
              )}>
                {isCustomPresetMode ? (
                  <Target className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                ) : (
                  <Timer className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                )}
              </div>
              {isCustomPresetMode ? 
                (isEditingCustomPreset ? 'Edit Custom Preset' : 'Create Custom Preset') :
                'Timer Settings'
              }
            </h1>
            <p className="text-slate-400 mt-1">
              {isCustomPresetMode ? 
                'Configure your personalized boxing timer preset' :
                'Customize your boxing workout timer configuration'
              }
            </p>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4"
          >
            <p className="text-red-400 text-sm">{error}</p>
          </motion.div>
        )}

        {/* Settings content */}
        <div className="space-y-4 sm:space-y-6 lg:space-y-8">
          {/* Preset name setting - Only in custom preset mode */}
          {isCustomPresetMode && (
            <motion.div 
              className="bg-slate-800/50 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-700/50"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <div className="space-y-4">
                <Label className="text-lg font-medium text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-400" />
                  Preset Name
                </Label>
                <Input
                  value={presetName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPresetName(e.target.value)}
                  placeholder="Enter preset name"
                  maxLength={30}
                  className={cn(
                    "bg-slate-900/50 border-slate-600 text-white",
                    "placeholder:text-slate-500",
                    "focus:border-indigo-500 focus:ring-indigo-500/20",
                    "h-12 text-base"
                  )}
                />
                <p className="text-sm text-slate-400">
                  Give your custom preset a memorable name (max 30 characters)
                </p>
              </div>
            </motion.div>
          )}

          {/* Rounds setting */}
          <motion.div 
            className="bg-slate-800/50 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-700/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-medium text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-400" />
                  Number of Rounds
                </Label>
                <motion.span
                  key={localConfig.totalRounds}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-3xl font-bold text-blue-400"
                >
                  {localConfig.totalRounds}
                </motion.span>
              </div>
              <Slider
                value={[localConfig.totalRounds]}
                onValueChange={([value]) => 
                  setLocalConfig(prev => ({ ...prev, totalRounds: value }))
                }
                min={limits.rounds.min}
                max={limits.rounds.max}
                step={1}
                className="cursor-pointer"
              />
              <div className="flex justify-between text-sm text-slate-500">
                <span>{limits.rounds.min} round</span>
                <span>{limits.rounds.max} rounds</span>
              </div>
            </div>
          </motion.div>

          {/* Work duration setting */}
          <motion.div 
            className="bg-slate-800/50 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-700/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-medium text-white flex items-center gap-2">
                  <Timer className="w-5 h-5 text-red-400" />
                  Work Duration
                </Label>
                <motion.span
                  key={localConfig.workDuration}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={cn(
                    "text-3xl font-bold",
                    localConfig.workDuration < 60 ? "text-orange-400" : "text-red-400"
                  )}
                >
                  {formatDuration(localConfig.workDuration)}
                </motion.span>
              </div>
              
              {/* Quick select pills for common short durations */}
              <div className="flex gap-2 flex-wrap">
                {[10, 15, 20, 30, 45].map((seconds) => (
                  <motion.button
                    key={seconds}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setLocalConfig(prev => ({ ...prev, workDuration: seconds }))}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                      "bg-slate-700/50 border border-slate-600/50",
                      "hover:bg-slate-600/50 hover:border-slate-500/70",
                      localConfig.workDuration === seconds
                        ? "bg-orange-500/20 border-orange-400/50 text-orange-300"
                        : "text-slate-300"
                    )}
                  >
                    {seconds}s
                  </motion.button>
                ))}
              </div>
              
              <Slider
                value={[localConfig.workDuration]}
                onValueChange={([value]) => 
                  setLocalConfig(prev => ({ ...prev, workDuration: value }))
                }
                min={limits.workDuration.min}
                max={limits.workDuration.max}
                step={localConfig.workDuration < 60 ? 5 : 15}
                className={cn(
                  "cursor-pointer",
                  localConfig.workDuration < 60 && "[&_[role=slider]]:bg-orange-400"
                )}
              />
              <div className="flex justify-between text-sm text-slate-500">
                <span>10 seconds</span>
                <span>10 minutes</span>
              </div>
              {localConfig.workDuration < 60 && (
                <p className="text-sm text-orange-400/70 text-center">
                  Short interval mode - perfect for HIIT training
                </p>
              )}
            </div>
          </motion.div>

          {/* Rest duration setting */}
          <motion.div 
            className="bg-slate-800/50 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-700/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-medium text-white flex items-center gap-2">
                  <Coffee className="w-5 h-5 text-green-400" />
                  Rest Duration
                </Label>
                <motion.span
                  key={localConfig.restDuration}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={cn(
                    "text-3xl font-bold",
                    localConfig.restDuration < 60 ? "text-lime-400" : "text-green-400"
                  )}
                >
                  {formatDuration(localConfig.restDuration)}
                </motion.span>
              </div>
              
              {/* Quick select pills for common short rest durations */}
              <div className="flex gap-2 flex-wrap">
                {[10, 15, 20, 30, 45].map((seconds) => (
                  <motion.button
                    key={seconds}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setLocalConfig(prev => ({ ...prev, restDuration: seconds }))}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                      "bg-slate-700/50 border border-slate-600/50",
                      "hover:bg-slate-600/50 hover:border-slate-500/70",
                      localConfig.restDuration === seconds
                        ? "bg-lime-500/20 border-lime-400/50 text-lime-300"
                        : "text-slate-300"
                    )}
                  >
                    {seconds}s
                  </motion.button>
                ))}
              </div>
              
              <Slider
                value={[localConfig.restDuration]}
                onValueChange={([value]) => 
                  setLocalConfig(prev => ({ ...prev, restDuration: value }))
                }
                min={limits.restDuration.min}
                max={limits.restDuration.max}
                step={localConfig.restDuration < 60 ? 5 : 15}
                className={cn(
                  "cursor-pointer",
                  localConfig.restDuration < 60 && "[&_[role=slider]]:bg-lime-400"
                )}
              />
              <div className="flex justify-between text-sm text-slate-500">
                <span>10 seconds</span>
                <span>5 minutes</span>
              </div>
              {localConfig.restDuration < 60 && (
                <p className="text-sm text-lime-400/70 text-center">
                  Short rest mode - ideal for active recovery
                </p>
              )}
            </div>
          </motion.div>

          {/* Preparation duration setting */}
          <motion.div 
            className="bg-slate-800/50 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-700/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-medium text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-400" />
                  Get Ready Period
                </Label>
                <motion.span
                  key={localConfig.prepDuration || 10}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-3xl font-bold text-blue-400"
                >
                  {formatDuration(localConfig.prepDuration || 10)}
                </motion.span>
              </div>
              <Slider
                value={[localConfig.prepDuration || 10]}
                onValueChange={([value]) => 
                  setLocalConfig(prev => ({ ...prev, prepDuration: value }))
                }
                min={limits.prepDuration.min}
                max={limits.prepDuration.max}
                step={limits.prepDuration.step}
                className="cursor-pointer"
              />
              <div className="flex justify-between text-sm text-slate-500">
                <span>No prep</span>
                <span>1 minute</span>
              </div>
              <p className="text-sm text-slate-400">
                Time to get ready before Round 1 starts. A 10-second warning will play regardless of duration.
              </p>
            </div>
          </motion.div>

          {/* 10-second warning toggle */}
          <motion.div 
            className="bg-slate-800/50 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-700/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <Info className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <Label className="text-lg font-medium text-white">
                    10-Second Warning
                  </Label>
                  <p className="text-sm text-slate-400">
                    Play warning sound before period ends
                  </p>
                </div>
              </div>
              <Switch
                checked={localConfig.enableWarning}
                onCheckedChange={(checked) => 
                  setLocalConfig(prev => ({ ...prev, enableWarning: checked }))
                }
              />
            </div>
          </motion.div>

          {/* Total workout time display */}
          <motion.div
            className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl sm:rounded-2xl p-4 sm:p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium text-slate-300">
                Total Workout Time
              </span>
              <motion.span
                key={totalWorkoutTime()}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
              >
                {totalWorkoutTime()}
              </motion.span>
            </div>
          </motion.div>
        </div>

        {/* Action buttons - Fixed at bottom on mobile */}
        <div className="sticky bottom-0 mt-6 sm:mt-8 p-3 sm:p-4 -mx-3 sm:-mx-4 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent backdrop-blur-sm">
          <div className="flex gap-2 sm:gap-3">
            <Button
              onClick={handleReset}
              variant="outline"
              disabled={!hasChanges}
              className={cn(
                'flex-1 h-12 sm:h-14 text-sm sm:text-base',
                'bg-slate-800/50 border-slate-600',
                'hover:bg-slate-700/50 hover:border-slate-500',
                'disabled:opacity-30 text-slate-300 hover:text-white'
              )}
            >
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
              Reset
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isLoading}
              className={cn(
                'flex-1 h-12 sm:h-14 text-sm sm:text-base font-semibold',
                isCustomPresetMode 
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700',
                'text-white border-0',
                'disabled:opacity-30'
              )}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  {isCustomPresetMode ? 'Saving...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                  {isCustomPresetMode ? 
                    (isEditingCustomPreset ? 'Update Custom Preset' : 'Save Custom Preset') :
                    'Save Changes'
                  }
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

/**
 * Settings Page with Suspense wrapper
 * 
 * Wraps the settings page content in Suspense to handle useSearchParams
 * which requires client-side rendering for URL parameter access.
 */
export default function SettingsPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 overflow-x-hidden flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </main>
    }>
      <SettingsPageContent />
    </Suspense>
  );
}