'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Timer, 
  Activity, 
  Coffee, 
  Info,
  ArrowLeft,
  Loader2,
  Check,
  AlertTriangle
} from 'lucide-react';
import { useTimer } from '@/hooks/use-timer';
import { useAutoSaveSettings } from '@/hooks/use-auto-save-settings';
import { useToastHelpers } from '@/components/ui/toast';
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
 * Auto-save settings page with premium toast notifications and visual feedback.
 * Features real-time saving, undo functionality, and timer state protection.
 */
export default function SettingsPage() {
  const router = useRouter();
  const { showSuccess, showUndo, showError } = useToastHelpers();
  
  // Get timer state for blocking protection
  const { state: timerState } = useTimer();
  
  // Auto-save settings hook with callbacks
  const {
    config,
    updateConfig,
    isSaving,
    lastSaveSuccess,
    lastSaveError,
    isBlocked,
    undoLastChange
  } = useAutoSaveSettings({
    timerStatus: timerState.status,
    onSaveSuccess: () => {
      showSuccess('Settings saved', 'Your timer configuration has been updated');
      
      // Show undo toast for 3 seconds
      showUndo(
        'Settings updated',
        () => {
          if (undoLastChange()) {
            showSuccess('Changes undone', 'Settings have been restored');
          }
        },
        'Tap undo to revert changes'
      );
    },
    onSaveError: (error) => {
      showError('Failed to save settings', error.message);
    },
    onSaveBlocked: (reason) => {
      showError('Settings locked', reason);
    }
  });

  // Handle back navigation
  const handleBack = () => {
    if (isSaving) {
      showError('Please wait', 'Settings are currently being saved');
      return;
    }
    router.push('/');
  };

  // Calculate total workout time
  const totalWorkoutTime = () => {
    const totalSeconds = 
      (config.prepDuration || 10) +
      (config.workDuration * config.totalRounds) +
      (config.restDuration * (config.totalRounds - 1));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Saving indicator component
  const SavingIndicator = ({ visible }: { visible: boolean }) => {
    if (!visible) return null;
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className="flex items-center gap-2 text-blue-400 text-sm"
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Saving...</span>
      </motion.div>
    );
  };

  // Success indicator component
  const SuccessIndicator = ({ visible }: { visible: boolean }) => {
    if (!visible) return null;
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className="flex items-center gap-2 text-green-400 text-sm"
      >
        <Check className="w-4 h-4" />
        <span>Saved</span>
      </motion.div>
    );
  };

  // Blocked indicator component
  const BlockedIndicator = ({ visible }: { visible: boolean }) => {
    if (!visible) return null;
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className="flex items-center gap-2 text-orange-400 text-sm"
      >
        <AlertTriangle className="w-4 h-4" />
        <span>Timer running - settings locked</span>
      </motion.div>
    );
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      {/* Background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800/20 via-transparent to-transparent" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />

      <div className="relative z-10 container mx-auto px-4 py-6 max-w-2xl">
        {/* Header with back button and status */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            onClick={handleBack}
            variant="ghost"
            size="icon"
            className="text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Timer className="w-6 h-6 text-white" />
              </div>
              Timer Settings
            </h1>
            <div className="flex items-center gap-4 mt-1">
              <p className="text-slate-400">
                Customize your boxing workout timer configuration
              </p>
              <div className="flex items-center gap-3">
                <SavingIndicator visible={isSaving} />
                <SuccessIndicator visible={lastSaveSuccess && !isSaving && !lastSaveError} />
                <BlockedIndicator visible={isBlocked} />
              </div>
            </div>
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
                  key={config.totalRounds}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-3xl font-bold text-blue-400"
                >
                  {config.totalRounds}
                </motion.span>
              </div>
              <Slider
                value={[config.totalRounds]}
                onValueChange={([value]) => 
                  updateConfig({ totalRounds: value })
                }
                min={limits.rounds.min}
                max={limits.rounds.max}
                step={1}
                className={cn(
                  'cursor-pointer',
                  isBlocked && 'opacity-50 pointer-events-none'
                )}
                disabled={isBlocked}
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
                  key={config.workDuration}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={cn(
                    "text-3xl font-bold",
                    config.workDuration < 60 ? "text-orange-400" : "text-red-400"
                  )}
                >
                  {formatDuration(config.workDuration)}
                </motion.span>
              </div>
              
              {/* Quick select pills for common short durations */}
              <div className="flex gap-2 flex-wrap">
                {[10, 15, 20, 30, 45].map((seconds) => (
                  <motion.button
                    key={seconds}
                    whileHover={!isBlocked ? { scale: 1.05 } : {}}
                    whileTap={!isBlocked ? { scale: 0.95 } : {}}
                    onClick={() => !isBlocked && updateConfig({ workDuration: seconds })}
                    disabled={isBlocked}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                      "bg-slate-700/50 border border-slate-600/50",
                      !isBlocked && "hover:bg-slate-600/50 hover:border-slate-500/70",
                      config.workDuration === seconds
                        ? "bg-orange-500/20 border-orange-400/50 text-orange-300"
                        : "text-slate-300",
                      isBlocked && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {seconds}s
                  </motion.button>
                ))}
              </div>
              
              <Slider
                value={[config.workDuration]}
                onValueChange={([value]) => 
                  updateConfig({ workDuration: value })
                }
                min={limits.workDuration.min}
                max={limits.workDuration.max}
                step={config.workDuration < 60 ? 5 : 15}
                className={cn(
                  "cursor-pointer",
                  config.workDuration < 60 && "[&_[role=slider]]:bg-orange-400",
                  isBlocked && "opacity-50 pointer-events-none"
                )}
                disabled={isBlocked}
              />
              <div className="flex justify-between text-sm text-slate-500">
                <span>10 seconds</span>
                <span>10 minutes</span>
              </div>
              {config.workDuration < 60 && (
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
                  key={config.restDuration}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={cn(
                    "text-3xl font-bold",
                    config.restDuration < 60 ? "text-lime-400" : "text-green-400"
                  )}
                >
                  {formatDuration(config.restDuration)}
                </motion.span>
              </div>
              
              {/* Quick select pills for common short rest durations */}
              <div className="flex gap-2 flex-wrap">
                {[10, 15, 20, 30, 45].map((seconds) => (
                  <motion.button
                    key={seconds}
                    whileHover={!isBlocked ? { scale: 1.05 } : {}}
                    whileTap={!isBlocked ? { scale: 0.95 } : {}}
                    onClick={() => !isBlocked && updateConfig({ restDuration: seconds })}
                    disabled={isBlocked}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                      "bg-slate-700/50 border border-slate-600/50",
                      !isBlocked && "hover:bg-slate-600/50 hover:border-slate-500/70",
                      config.restDuration === seconds
                        ? "bg-lime-500/20 border-lime-400/50 text-lime-300"
                        : "text-slate-300",
                      isBlocked && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {seconds}s
                  </motion.button>
                ))}
              </div>
              
              <Slider
                value={[config.restDuration]}
                onValueChange={([value]) => 
                  updateConfig({ restDuration: value })
                }
                min={limits.restDuration.min}
                max={limits.restDuration.max}
                step={config.restDuration < 60 ? 5 : 15}
                className={cn(
                  "cursor-pointer",
                  config.restDuration < 60 && "[&_[role=slider]]:bg-lime-400",
                  isBlocked && "opacity-50 pointer-events-none"
                )}
                disabled={isBlocked}
              />
              <div className="flex justify-between text-sm text-slate-500">
                <span>10 seconds</span>
                <span>5 minutes</span>
              </div>
              {config.restDuration < 60 && (
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
                  key={config.prepDuration || 10}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-3xl font-bold text-blue-400"
                >
                  {formatDuration(config.prepDuration || 10)}
                </motion.span>
              </div>
              <Slider
                value={[config.prepDuration || 10]}
                onValueChange={([value]) => 
                  updateConfig({ prepDuration: value })
                }
                min={limits.prepDuration.min}
                max={limits.prepDuration.max}
                step={limits.prepDuration.step}
                className={cn(
                  'cursor-pointer',
                  isBlocked && 'opacity-50 pointer-events-none'
                )}
                disabled={isBlocked}
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
                checked={config.enableWarning}
                onCheckedChange={(checked) => 
                  updateConfig({ enableWarning: checked })
                }
                disabled={isBlocked}
                className={cn(
                  isBlocked && 'opacity-50'
                )}
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

        {/* Auto-save status footer */}
        {(isSaving || isBlocked || lastSaveError) && (
          <div className="mt-8 p-4 rounded-2xl border bg-slate-800/30 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-3">
              {isSaving && (
                <div className="flex items-center gap-2 text-blue-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-medium">Saving settings...</span>
                </div>
              )}
              
              {isBlocked && !isSaving && (
                <div className="flex items-center gap-2 text-orange-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">Settings locked while timer is active</span>
                </div>
              )}
              
              {lastSaveError && !isSaving && (
                <div className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">Failed to save: {lastSaveError.message}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}