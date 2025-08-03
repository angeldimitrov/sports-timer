'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Timer, 
  Activity, 
  Coffee, 
  Info,
  Save,
  RotateCcw,
  ArrowLeft
} from 'lucide-react';
import { TimerConfig } from '@/lib/timer-engine';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
 * Settings Page Component
 * 
 * Full-screen settings page with mobile-optimized layout and navigation.
 * Features proper scrolling, back button navigation, and touch-friendly controls.
 */
export default function SettingsPage() {
  const router = useRouter();
  
  // Local state for editing
  const [localConfig, setLocalConfig] = useState<TimerConfig>({
    totalRounds: 5,
    workDuration: 180, // 3 minutes
    restDuration: 60,  // 1 minute
    enableWarning: true,
    prepDuration: 10,
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [originalConfig, setOriginalConfig] = useState<TimerConfig>(localConfig);

  // Load configuration from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('boxing-timer-config');
      if (saved) {
        const config = JSON.parse(saved);
        setLocalConfig(config);
        setOriginalConfig(config);
      }
    } catch (error) {
      console.warn('Failed to load saved config:', error);
    }
  }, []);

  // Check if configuration has changed
  useEffect(() => {
    const changed = 
      localConfig.totalRounds !== originalConfig.totalRounds ||
      localConfig.workDuration !== originalConfig.workDuration ||
      localConfig.restDuration !== originalConfig.restDuration ||
      localConfig.enableWarning !== originalConfig.enableWarning ||
      (localConfig.prepDuration || 10) !== (originalConfig.prepDuration || 10);
    setHasChanges(changed);
  }, [localConfig, originalConfig]);

  // Handle save
  const handleSave = () => {
    try {
      localStorage.setItem('boxing-timer-config', JSON.stringify(localConfig));
      setOriginalConfig(localConfig);
      setHasChanges(false);
      
      // Navigate back to timer with config update
      router.push('/?updated=true');
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  };

  // Handle reset
  const handleReset = () => {
    setLocalConfig(originalConfig);
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
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      {/* Background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800/20 via-transparent to-transparent" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />

      <div className="relative z-10 container mx-auto px-4 py-6 max-w-2xl">
        {/* Header with back button */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            onClick={handleBack}
            variant="ghost"
            size="icon"
            className="text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Timer className="w-6 h-6 text-white" />
              </div>
              Timer Settings
            </h1>
            <p className="text-slate-400 mt-1">
              Customize your boxing workout timer configuration
            </p>
          </div>
        </div>

        {/* Settings content */}
        <div className="space-y-8">
          {/* Rounds setting */}
          <motion.div 
            className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50"
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
            className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50"
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
            className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50"
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
            className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50"
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
            className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50"
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
            className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-6"
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
        <div className="sticky bottom-0 mt-8 p-4 -mx-4 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent backdrop-blur-sm">
          <div className="flex gap-3">
            <Button
              onClick={handleReset}
              variant="outline"
              disabled={!hasChanges}
              className={cn(
                'flex-1 h-14 text-base',
                'bg-slate-800/50 border-slate-600',
                'hover:bg-slate-700/50 hover:border-slate-500',
                'disabled:opacity-30 text-slate-300 hover:text-white'
              )}
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Reset
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges}
              className={cn(
                'flex-1 h-14 text-base font-semibold',
                'bg-gradient-to-r from-blue-500 to-indigo-600',
                'hover:from-blue-600 hover:to-indigo-700',
                'text-white border-0',
                'disabled:opacity-30'
              )}
            >
              <Save className="w-5 h-5 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}