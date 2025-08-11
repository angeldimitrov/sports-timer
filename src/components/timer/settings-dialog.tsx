/**
 * Inline Settings Dialog Component
 * 
 * Compact settings interface that opens as a modal dialog for quick timer configuration.
 * Replaces navigation to separate settings page for better UX flow.
 * 
 * Features:
 * - Preset selection (Beginner, Intermediate, Advanced, Custom)
 * - Custom timer configuration (rounds, work time, rest time)
 * - Inline editing without page navigation
 * - Settings persistence with localStorage
 */

import React, { useState } from 'react';
import { Settings, Clock, RotateCcw, Target } from 'lucide-react';
import { UseTimerReturn } from '@/hooks/use-timer';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SettingsDialogProps {
  /** Timer hook instance */
  timer: UseTimerReturn;
  /** Current selected preset */
  selectedPreset: 'beginner' | 'intermediate' | 'advanced' | 'custom';
  /** Callback for preset selection */
  onPresetSelect: (preset: 'beginner' | 'intermediate' | 'advanced' | 'custom') => void;
  /** Whether dialog is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Inline settings dialog for timer configuration
 * 
 * Provides quick access to preset selection and custom timer settings
 * without requiring page navigation. Optimized for mobile use.
 */
export function SettingsDialog({
  timer,
  selectedPreset,
  onPresetSelect,
  disabled = false,
  className
}: SettingsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customConfig, setCustomConfig] = useState({
    rounds: timer.config.totalRounds || 3,
    workDuration: Math.floor(timer.config.workDuration / 60),
    restDuration: Math.floor(timer.config.restDuration / 60),
    preparationTime: 10,
  });

  // Preset configurations
  const presets = {
    beginner: { rounds: 3, workDuration: 2, restDuration: 1, label: 'Beginner', icon: Target },
    intermediate: { rounds: 5, workDuration: 3, restDuration: 1, label: 'Intermediate', icon: Clock },
    advanced: { rounds: 12, workDuration: 3, restDuration: 1, label: 'Advanced', icon: RotateCcw },
  };

  // Handle preset selection
  const handlePresetSelect = (preset: keyof typeof presets) => {
    const config = presets[preset];
    timer.updateConfig({
      totalRounds: config.rounds,
      workDuration: config.workDuration * 60,
      restDuration: config.restDuration * 60,
    });
    onPresetSelect(preset as 'beginner' | 'intermediate' | 'advanced');
  };

  // Handle custom configuration
  const handleCustomApply = () => {
    timer.updateConfig({
      totalRounds: customConfig.rounds,
      workDuration: customConfig.workDuration * 60,
      restDuration: customConfig.restDuration * 60,
    });
    onPresetSelect('custom');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full h-12 rounded-lg text-sm font-medium',
            'glass border-slate-600/50',
            'hover:bg-blue-900/40 hover:border-blue-500/50',
            'text-slate-200 hover:text-white',
            'transition-all duration-200 ease-out shadow-md',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            className
          )}
        >
          <Settings className="w-3.5 h-3.5 mr-1.5" />
          Settings
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md bg-slate-900/95 border-slate-700/50 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-white">Timer Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Preset Selection */}
          <div className="space-y-3">
            <Label className="text-slate-200 text-sm font-medium">Quick Presets</Label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(presets).map(([key, preset]) => {
                const Icon = preset.icon;
                const isSelected = selectedPreset === key;
                
                return (
                  <Button
                    key={key}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePresetSelect(key as keyof typeof presets)}
                    className={cn(
                      'h-16 flex-col gap-1 text-xs',
                      isSelected 
                        ? 'bg-blue-600 hover:bg-blue-700 border-blue-500'
                        : 'glass border-slate-600/50 hover:bg-slate-700/50'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{preset.label}</span>
                    <span className="text-xs opacity-70">
                      {preset.rounds}r • {preset.workDuration}m
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Custom Configuration */}
          <div className="space-y-4">
            <Label className="text-slate-200 text-sm font-medium">Custom Settings</Label>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="rounds" className="text-xs text-slate-300">Rounds</Label>
                <Input
                  id="rounds"
                  type="number"
                  min="1"
                  max="20"
                  value={customConfig.rounds}
                  onChange={(e) => setCustomConfig(prev => ({ ...prev, rounds: parseInt(e.target.value) }))}
                  className="h-10 bg-slate-800 border-slate-600 text-white"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="prep" className="text-xs text-slate-300">Prep (sec)</Label>
                <Input
                  id="prep"
                  type="number"
                  min="5"
                  max="30"
                  value={customConfig.preparationTime}
                  onChange={(e) => setCustomConfig(prev => ({ ...prev, preparationTime: parseInt(e.target.value) }))}
                  className="h-10 bg-slate-800 border-slate-600 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="work" className="text-xs text-slate-300">Work (min)</Label>
                <Input
                  id="work"
                  type="number"
                  min="1"
                  max="10"
                  value={customConfig.workDuration}
                  onChange={(e) => setCustomConfig(prev => ({ ...prev, workDuration: parseInt(e.target.value) }))}
                  className="h-10 bg-slate-800 border-slate-600 text-white"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rest" className="text-xs text-slate-300">Rest (min)</Label>
                <Input
                  id="rest"
                  type="number"
                  min="0"
                  max="5"
                  step="0.5"
                  value={customConfig.restDuration}
                  onChange={(e) => setCustomConfig(prev => ({ ...prev, restDuration: parseFloat(e.target.value) }))}
                  className="h-10 bg-slate-800 border-slate-600 text-white"
                />
              </div>
            </div>

            <Button
              onClick={handleCustomApply}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Apply Custom Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}