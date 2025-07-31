/**
 * Settings Dialog Component
 * 
 * Premium settings interface for customizing timer configuration with sophisticated controls.
 * Features smooth animations, visual feedback, and intuitive input controls.
 * 
 * Design Principles:
 * - Clear labeling and help text for all settings
 * - Visual feedback for value changes
 * - Input validation with error states
 * - Smooth dialog transitions
 * - Mobile-responsive layout
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Timer, 
  Activity, 
  Coffee, 
  Volume2,
  Info,
  Save,
  RotateCcw
} from 'lucide-react';
import { TimerConfig } from '@/lib/timer-engine';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface SettingsDialogProps {
  /** Whether dialog is open */
  isOpen: boolean;
  /** Callback to close dialog */
  onClose: () => void;
  /** Current timer configuration */
  config: TimerConfig;
  /** Callback when configuration is updated */
  onConfigUpdate: (config: Partial<TimerConfig>) => void;
  /** Current audio volume */
  audioVolume: number;
  /** Whether audio is muted */
  audioMuted: boolean;
  /** Callback for volume changes */
  onVolumeChange: (volume: number) => void;
  /** Callback for mute toggle */
  onMutedChange: (muted: boolean) => void;
}

// Configuration limits
const limits = {
  rounds: { min: 1, max: 20 },
  workDuration: { min: 60, max: 600, step: 15 }, // 1-10 minutes in 15s increments
  restDuration: { min: 15, max: 300, step: 15 }, // 15s-5 minutes in 15s increments
  prepDuration: { min: 0, max: 60, step: 5 }, // 0-60 seconds in 5s increments
};

/**
 * Format seconds to display string
 */
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) {
    return `${minutes} min`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Premium settings dialog with sophisticated controls
 * 
 * Features:
 * - Visual sliders with real-time feedback
 * - Input validation and constraints
 * - Audio settings integration
 * - Save and reset functionality
 * - Smooth animations and transitions
 * - Mobile-optimized layout
 */
export function SettingsDialog({
  isOpen,
  onClose,
  config,
  onConfigUpdate,
  audioVolume,
  audioMuted,
  onVolumeChange,
  onMutedChange,
}: SettingsDialogProps) {
  // Local state for editing
  const [localConfig, setLocalConfig] = useState<TimerConfig>(config);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync local state when config changes
  useEffect(() => {
    setLocalConfig(config);
    setHasChanges(false);
  }, [config]);

  // Check if configuration has changed
  useEffect(() => {
    const changed = 
      localConfig.totalRounds !== config.totalRounds ||
      localConfig.workDuration !== config.workDuration ||
      localConfig.restDuration !== config.restDuration ||
      localConfig.enableWarning !== config.enableWarning ||
      (localConfig.prepDuration || 10) !== (config.prepDuration || 10);
    setHasChanges(changed);
  }, [localConfig, config]);

  // Handle save
  const handleSave = () => {
    onConfigUpdate(localConfig);
    onClose();
  };

  // Handle reset
  const handleReset = () => {
    setLocalConfig(config);
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Timer className="w-5 h-5 text-white" />
            </div>
            Timer Settings
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Customize your boxing workout timer configuration
          </DialogDescription>
        </DialogHeader>

        {/* Settings content */}
        <div className="space-y-6 py-4">
          {/* Rounds setting */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                Number of Rounds
              </Label>
              <motion.span
                key={localConfig.totalRounds}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-2xl font-bold text-blue-400"
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
            <div className="flex justify-between text-xs text-slate-500">
              <span>{limits.rounds.min} round</span>
              <span>{limits.rounds.max} rounds</span>
            </div>
          </div>

          {/* Work duration setting */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium text-white flex items-center gap-2">
                <Timer className="w-4 h-4 text-red-400" />
                Work Duration
              </Label>
              <motion.span
                key={localConfig.workDuration}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-2xl font-bold text-red-400"
              >
                {formatDuration(localConfig.workDuration)}
              </motion.span>
            </div>
            <Slider
              value={[localConfig.workDuration]}
              onValueChange={([value]) => 
                setLocalConfig(prev => ({ ...prev, workDuration: value }))
              }
              min={limits.workDuration.min}
              max={limits.workDuration.max}
              step={limits.workDuration.step}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>1 minute</span>
              <span>10 minutes</span>
            </div>
          </div>

          {/* Rest duration setting */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium text-white flex items-center gap-2">
                <Coffee className="w-4 h-4 text-green-400" />
                Rest Duration
              </Label>
              <motion.span
                key={localConfig.restDuration}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-2xl font-bold text-green-400"
              >
                {formatDuration(localConfig.restDuration)}
              </motion.span>
            </div>
            <Slider
              value={[localConfig.restDuration]}
              onValueChange={([value]) => 
                setLocalConfig(prev => ({ ...prev, restDuration: value }))
              }
              min={limits.restDuration.min}
              max={limits.restDuration.max}
              step={limits.restDuration.step}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>15 seconds</span>
              <span>5 minutes</span>
            </div>
          </div>

          {/* Preparation duration setting */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                Get Ready Period
              </Label>
              <motion.span
                key={localConfig.prepDuration || 10}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-2xl font-bold text-blue-400"
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
            <div className="flex justify-between text-xs text-slate-500">
              <span>No prep</span>
              <span>1 minute</span>
            </div>
            <p className="text-xs text-slate-400">
              Time to get ready before Round 1 starts. A 10-second warning will play regardless of duration.
            </p>
          </div>

          {/* 10-second warning toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Info className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <Label className="text-base font-medium text-white">
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

          {/* Total workout time display */}
          <motion.div
            className="p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20"
            animate={{
              borderColor: hasChanges ? 'rgb(59 130 246 / 0.4)' : 'rgb(59 130 246 / 0.2)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-300">
                Total Workout Time
              </span>
              <motion.span
                key={totalWorkoutTime()}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
              >
                {totalWorkoutTime()}
              </motion.span>
            </div>
          </motion.div>

          {/* Audio settings */}
          <div className="space-y-3 pt-4 border-t border-slate-700/50">
            <Label className="text-base font-medium text-white flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-purple-400" />
              Master Volume
            </Label>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => onMutedChange(!audioMuted)}
                variant="ghost"
                size="icon"
                className={cn(
                  'shrink-0',
                  audioMuted && 'text-slate-500'
                )}
              >
                <Volume2 className="w-5 h-5" />
              </Button>
              <Slider
                value={[audioMuted ? 0 : audioVolume]}
                onValueChange={([value]) => {
                  onVolumeChange(value);
                  if (value > 0 && audioMuted) {
                    onMutedChange(false);
                  }
                }}
                max={100}
                step={5}
                className="cursor-pointer"
              />
              <span className="text-sm font-medium text-slate-400 w-12 text-right">
                {audioMuted ? 0 : audioVolume}%
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-4 border-t border-slate-700/50">
          <Button
            onClick={handleReset}
            variant="outline"
            disabled={!hasChanges}
            className={cn(
              'flex-1',
              'bg-slate-800/50 border-slate-600',
              'hover:bg-slate-700/50 hover:border-slate-500',
              'disabled:opacity-30'
            )}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges}
            className={cn(
              'flex-1',
              'bg-gradient-to-r from-blue-500 to-indigo-600',
              'hover:from-blue-600 hover:to-indigo-700',
              'text-white border-0',
              'disabled:opacity-30'
            )}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}