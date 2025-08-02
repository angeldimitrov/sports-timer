/**
 * useAutoSaveSettings React Hook
 * 
 * React hook for automatic settings persistence with debounced saving and timer state protection.
 * Provides modern auto-save functionality while preventing settings changes during active workouts.
 * 
 * Business Context:
 * - Automatically saves settings changes to localStorage after debounced delay
 * - Prevents accidental settings changes during active timer sessions
 * - Provides visual feedback and undo functionality for better UX
 * - Validates settings to prevent invalid configurations
 * - Handles localStorage failures gracefully with fallback mechanisms
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { TimerConfig, TimerStatus } from '@/lib/timer-engine';

export interface UseAutoSaveSettingsOptions {
  /** Timer status to prevent saves during active sessions */
  timerStatus?: TimerStatus;
  /** Debounce delay in milliseconds (default: 500ms) */
  debounceDelay?: number;
}

export interface UseAutoSaveSettingsReturn {
  /** Current settings configuration */
  config: TimerConfig;
  /** Update settings (triggers auto-save) */
  updateConfig: (updates: Partial<TimerConfig>) => void;
  /** Whether settings are currently being saved */
  isSaving: boolean;
  /** Whether last save was successful */
  lastSaveSuccess: boolean;
  /** Last save error if any */
  lastSaveError: Error | null;
  /** Whether settings changes are currently blocked */
  isBlocked: boolean;
  /** Validate current configuration */
  validateConfig: (config: TimerConfig) => string[];
}

// Configuration limits for validation
const CONFIG_LIMITS = {
  workDuration: { min: 10, max: 600 }, // 10 seconds to 10 minutes
  restDuration: { min: 10, max: 300 }, // 10 seconds to 5 minutes
  totalRounds: { min: 1, max: 20 },
  prepDuration: { min: 0, max: 60 }
};

// Default configuration
const DEFAULT_CONFIG: TimerConfig = {
  totalRounds: 5,
  workDuration: 180, // 3 minutes
  restDuration: 60,  // 1 minute
  enableWarning: true,
  prepDuration: 10,
};

/**
 * Auto-save settings hook with debouncing and timer state protection
 * 
 * Features:
 * - Debounced auto-save (500ms default delay)
 * - Timer state protection (no saves during running/paused sessions)
 * - Real-time validation with error feedback
 * - Undo functionality with 3-second window
 * - Visual feedback for saving state
 * - Graceful error handling for localStorage failures
 */
export function useAutoSaveSettings(options: UseAutoSaveSettingsOptions = {}): UseAutoSaveSettingsReturn {
  const {
    timerStatus,
    debounceDelay = 500
  } = options;

  // State management
  const [config, setConfig] = useState<TimerConfig>(DEFAULT_CONFIG);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveSuccess, setLastSaveSuccess] = useState(true);
  const [lastSaveError, setLastSaveError] = useState<Error | null>(null);
  
  // Refs for debouncing
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if settings changes are blocked due to timer state
  const isBlocked = timerStatus === 'running' || timerStatus === 'paused';

  // Validate configuration function
  const validateConfigInternal = useCallback((configToValidate: TimerConfig): string[] => {
    const errors: string[] = [];

    if (configToValidate.workDuration < CONFIG_LIMITS.workDuration.min || 
        configToValidate.workDuration > CONFIG_LIMITS.workDuration.max) {
      errors.push(`Work duration must be between ${CONFIG_LIMITS.workDuration.min} and ${CONFIG_LIMITS.workDuration.max} seconds`);
    }

    if (configToValidate.restDuration < CONFIG_LIMITS.restDuration.min || 
        configToValidate.restDuration > CONFIG_LIMITS.restDuration.max) {
      errors.push(`Rest duration must be between ${CONFIG_LIMITS.restDuration.min} and ${CONFIG_LIMITS.restDuration.max} seconds`);
    }

    if (configToValidate.totalRounds < CONFIG_LIMITS.totalRounds.min || 
        configToValidate.totalRounds > CONFIG_LIMITS.totalRounds.max) {
      errors.push(`Total rounds must be between ${CONFIG_LIMITS.totalRounds.min} and ${CONFIG_LIMITS.totalRounds.max}`);
    }

    if (configToValidate.prepDuration !== undefined && 
        (configToValidate.prepDuration < CONFIG_LIMITS.prepDuration.min || 
         configToValidate.prepDuration > CONFIG_LIMITS.prepDuration.max)) {
      errors.push(`Prep duration must be between ${CONFIG_LIMITS.prepDuration.min} and ${CONFIG_LIMITS.prepDuration.max} seconds`);
    }

    return errors;
  }, []);

  // Load initial configuration from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('boxing-timer-config');
      if (saved) {
        const parsedConfig = JSON.parse(saved);
        // Validate loaded config
        const errors = validateConfigInternal(parsedConfig);
        if (errors.length === 0) {
          setConfig(parsedConfig);
        } else {
          console.warn('Invalid saved config, using defaults:', errors);
          setConfig(DEFAULT_CONFIG);
        }
      }
    } catch (error) {
      console.error('Failed to load saved config:', error);
      setConfig(DEFAULT_CONFIG);
    }
  }, [validateConfigInternal]);

  // Save configuration to localStorage
  const saveConfig = useCallback(async (configToSave: TimerConfig) => {
    setIsSaving(true);
    setLastSaveError(null);

    try {
      // Validate before saving
      const errors = validateConfigInternal(configToSave);
      if (errors.length > 0) {
        throw new Error(`Invalid configuration: ${errors.join(', ')}`);
      }

      // Save to localStorage
      localStorage.setItem('boxing-timer-config', JSON.stringify(configToSave));
      
      setLastSaveSuccess(true);

    } catch (error) {
      const saveError = error instanceof Error ? error : new Error('Unknown save error');
      setLastSaveError(saveError);
      setLastSaveSuccess(false);
      console.error('Failed to save settings:', saveError);
    } finally {
      setIsSaving(false);
    }
  }, [validateConfigInternal]);

  // Update configuration with auto-save
  const updateConfig = useCallback((updates: Partial<TimerConfig>) => {
    // Check if changes are blocked due to timer state
    if (isBlocked) {
      console.warn('Settings cannot be changed while timer is running or paused');
      return;
    }

    // Update local state immediately
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);

    // Clear existing save timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Schedule debounced save
    saveTimeoutRef.current = setTimeout(() => {
      saveConfig(newConfig);
    }, debounceDelay);
  }, [config, isBlocked, debounceDelay, saveConfig]);


  // Public validate function
  const validateConfig = useCallback((configToValidate: TimerConfig): string[] => {
    return validateConfigInternal(configToValidate);
  }, [validateConfigInternal]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    config,
    updateConfig,
    isSaving,
    lastSaveSuccess,
    lastSaveError,
    isBlocked,
    validateConfig
  };
}