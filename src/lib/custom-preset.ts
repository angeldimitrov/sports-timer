/**
 * Custom Preset Management System
 * 
 * Provides utilities for creating, storing, and managing user-defined custom presets
 * alongside the standard boxing timer presets. This system extends the existing
 * preset architecture to support personalized workout configurations.
 * 
 * Business Context:
 * - Allows users to create personalized boxing timer configurations
 * - Stores custom preset data in localStorage for persistence
 * - Provides migration utilities for existing timer configurations
 * - Maintains backward compatibility with existing preset system
 * - Supports single custom preset initially (can be extended for multiple)
 * 
 * Technical Architecture:
 * - Custom preset stored separately from regular timer config
 * - Metadata tracking for creation, modification, and usage timestamps
 * - Validation ensures custom presets meet timer engine requirements
 * - Error handling with graceful fallbacks to standard presets
 */

import React from 'react';
import { TimerConfig } from './timer-engine';

// Extended preset type to include custom
export type PresetType = 'beginner' | 'intermediate' | 'advanced' | 'custom';

/**
 * Custom preset data structure with metadata
 * 
 * Business Rules:
 * - Only one custom preset can exist at a time (new one overwrites old)
 * - Custom preset must have a user-defined name (max 30 characters)
 * - All timer configuration values must be within valid ranges
 * - Metadata tracks usage patterns for future feature development
 */
export interface CustomPreset {
  /** Whether a custom preset has been created */
  exists: boolean;
  /** User-defined name for the preset (max 30 characters) */
  name: string;
  /** Timer configuration for the custom preset */
  config: TimerConfig;
  /** ISO timestamp when preset was first created */
  createdAt: string;
  /** ISO timestamp when preset was last modified */
  lastModified: string;
  /** ISO timestamp when preset was last used (optional) */
  lastUsed?: string;
  /** Version for future compatibility (starts at 1) */
  version: number;
}

/**
 * Preset display information for UI components
 * Used to unify display of standard and custom presets
 */
export interface PresetDisplayInfo {
  id: string;
  name: string;
  rounds: number;
  workDuration: number;
  restDuration: number;
  totalTime: string;
  color: string;
  icon: React.ComponentType<{ className?: string }> | null; // Lucide icon component
  difficulty: number; // 0 for custom preset
  isCustom: boolean;
}

// localStorage keys for custom preset system
const STORAGE_KEYS = {
  CUSTOM_PRESET: 'boxing-timer-custom-preset',
  TIMER_CONFIG: 'boxing-timer-config', // Existing key for backward compatibility
} as const;

// Configuration limits for validation
const PRESET_LIMITS = {
  name: { minLength: 1, maxLength: 30 },
  rounds: { min: 1, max: 20 },
  workDuration: { min: 10, max: 600 }, // 10 seconds to 10 minutes
  restDuration: { min: 10, max: 300 }, // 10 seconds to 5 minutes
  prepDuration: { min: 0, max: 60 },   // 0 to 60 seconds
} as const;

/**
 * Validation error types for custom preset creation
 */
export class CustomPresetValidationError extends Error {
  constructor(field: string, message: string) {
    super(`${field}: ${message}`);
    this.name = 'CustomPresetValidationError';
  }
}

/**
 * Storage error types for custom preset operations
 */
export class CustomPresetStorageError extends Error {
  public cause?: Error;
  
  constructor(operation: string, cause?: Error) {
    super(`Failed to ${operation} custom preset: ${cause?.message || 'Unknown error'}`);
    this.name = 'CustomPresetStorageError';
    this.cause = cause;
  }
}

/**
 * Validate custom preset name
 * 
 * Business Rules:
 * - Name must be between 1-30 characters
 * - No leading/trailing whitespace
 * - Cannot be same as standard preset names
 */
function validatePresetName(name: string): void {
  const trimmedName = name.trim();
  
  if (trimmedName.length < PRESET_LIMITS.name.minLength) {
    throw new CustomPresetValidationError('name', 'Name cannot be empty');
  }
  
  if (trimmedName.length > PRESET_LIMITS.name.maxLength) {
    throw new CustomPresetValidationError('name', `Name cannot exceed ${PRESET_LIMITS.name.maxLength} characters`);
  }
  
  // Prevent confusion with standard preset names
  const standardPresetNames = ['beginner', 'intermediate', 'advanced'];
  if (standardPresetNames.includes(trimmedName.toLowerCase())) {
    throw new CustomPresetValidationError('name', 'Cannot use standard preset names');
  }
}

/**
 * Validate timer configuration for custom preset
 * 
 * Ensures all timer values are within acceptable ranges for the timer engine
 */
function validateTimerConfig(config: TimerConfig): void {
  // Validate total rounds
  if (config.totalRounds < PRESET_LIMITS.rounds.min || config.totalRounds > PRESET_LIMITS.rounds.max) {
    throw new CustomPresetValidationError(
      'totalRounds', 
      `Must be between ${PRESET_LIMITS.rounds.min} and ${PRESET_LIMITS.rounds.max}`
    );
  }
  
  // Validate work duration
  if (config.workDuration < PRESET_LIMITS.workDuration.min || config.workDuration > PRESET_LIMITS.workDuration.max) {
    throw new CustomPresetValidationError(
      'workDuration', 
      `Must be between ${PRESET_LIMITS.workDuration.min} and ${PRESET_LIMITS.workDuration.max} seconds`
    );
  }
  
  // Validate rest duration
  if (config.restDuration < PRESET_LIMITS.restDuration.min || config.restDuration > PRESET_LIMITS.restDuration.max) {
    throw new CustomPresetValidationError(
      'restDuration', 
      `Must be between ${PRESET_LIMITS.restDuration.min} and ${PRESET_LIMITS.restDuration.max} seconds`
    );
  }
  
  // Validate prep duration (optional field)
  const prepDuration = config.prepDuration ?? 10;
  if (prepDuration < PRESET_LIMITS.prepDuration.min || prepDuration > PRESET_LIMITS.prepDuration.max) {
    throw new CustomPresetValidationError(
      'prepDuration', 
      `Must be between ${PRESET_LIMITS.prepDuration.min} and ${PRESET_LIMITS.prepDuration.max} seconds`
    );
  }
}

/**
 * Calculate total workout time in formatted string
 * 
 * Business Logic:
 * - Includes preparation time if configured
 * - Accounts for work periods in all rounds
 * - Accounts for rest periods between rounds (n-1 rest periods)
 * - Returns time in "MM:SS" format for display
 */
function calculateTotalTime(config: TimerConfig): string {
  const prepDuration = config.prepDuration ?? 0;
  const totalSeconds = 
    prepDuration +
    (config.workDuration * config.totalRounds) +
    (config.restDuration * (config.totalRounds - 1));
  
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Create a new custom preset
 * 
 * Business Process:
 * 1. Validate preset name and configuration
 * 2. Create preset object with metadata
 * 3. Store in localStorage
 * 4. Return success confirmation
 * 
 * @param name - User-defined name for the preset
 * @param config - Timer configuration
 * @returns Created custom preset data
 * @throws CustomPresetValidationError for invalid input
 * @throws CustomPresetStorageError for storage failures
 */
export function createCustomPreset(name: string, config: TimerConfig): CustomPreset {
  // Validate inputs
  validatePresetName(name);
  validateTimerConfig(config);
  
  const now = new Date().toISOString();
  
  // Create custom preset object
  const customPreset: CustomPreset = {
    exists: true,
    name: name.trim(),
    config: { ...config }, // Deep copy to prevent mutations
    createdAt: now,
    lastModified: now,
    version: 1
  };
  
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      throw new Error('Cannot access localStorage in server environment');
    }
    
    // Store in localStorage
    localStorage.setItem(STORAGE_KEYS.CUSTOM_PRESET, JSON.stringify(customPreset));
    
    return customPreset;
  } catch (error) {
    throw new CustomPresetStorageError('create', error as Error);
  }
}

/**
 * Update existing custom preset
 * 
 * Business Rules:
 * - Preserves creation timestamp and version
 * - Updates last modified timestamp
 * - Validates new configuration before saving
 * 
 * @param name - Updated name for the preset
 * @param config - Updated timer configuration
 * @returns Updated custom preset data
 * @throws CustomPresetValidationError for invalid input
 * @throws CustomPresetStorageError for storage failures or if no preset exists
 */
export function updateCustomPreset(name: string, config: TimerConfig): CustomPreset {
  const existing = getCustomPreset();
  
  if (!existing || !existing.exists) {
    throw new CustomPresetStorageError('update', new Error('No custom preset exists to update'));
  }
  
  // Validate new inputs
  validatePresetName(name);
  validateTimerConfig(config);
  
  // Create updated preset maintaining metadata
  const updatedPreset: CustomPreset = {
    ...existing,
    name: name.trim(),
    config: { ...config },
    lastModified: new Date().toISOString()
  };
  
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_PRESET, JSON.stringify(updatedPreset));
    
    return updatedPreset;
  } catch (error) {
    throw new CustomPresetStorageError('update', error as Error);
  }
}

/**
 * Get current custom preset from storage
 * 
 * @returns Custom preset data or null if none exists
 * @throws CustomPresetStorageError for corrupted data
 */
export function getCustomPreset(): CustomPreset | null {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CUSTOM_PRESET);
    
    if (!stored) {
      return null;
    }
    
    const parsed = JSON.parse(stored) as CustomPreset;
    
    // Validate stored data structure
    if (!parsed.exists || !parsed.name || !parsed.config) {
      throw new Error('Invalid custom preset data structure');
    }
    
    return parsed;
  } catch (error) {
    // For corrupted data, log error but don't throw - allow graceful degradation
    console.warn('Failed to load custom preset:', error);
    return null;
  }
}

/**
 * Mark custom preset as used (update lastUsed timestamp)
 * 
 * Used for tracking user engagement with custom presets
 * Fails silently to avoid disrupting timer functionality
 */
export function markCustomPresetUsed(): void {
  try {
    const existing = getCustomPreset();
    
    if (existing && existing.exists) {
      const updated: CustomPreset = {
        ...existing,
        lastUsed: new Date().toISOString()
      };
      
      localStorage.setItem(STORAGE_KEYS.CUSTOM_PRESET, JSON.stringify(updated));
    }
  } catch (error) {
    // Fail silently - usage tracking should not break timer functionality
    console.warn('Failed to update custom preset usage:', error);
  }
}

/**
 * Delete custom preset
 * 
 * Removes custom preset from localStorage entirely
 * Used when user wants to delete their custom configuration
 * 
 * @throws CustomPresetStorageError for storage failures
 */
export function deleteCustomPreset(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.CUSTOM_PRESET);
  } catch (error) {
    throw new CustomPresetStorageError('delete', error as Error);
  }
}

/**
 * Convert custom preset to display info for UI components
 * 
 * Creates unified interface for displaying custom preset alongside standard presets
 * Uses Target icon and custom color scheme for visual distinction
 */
export function getCustomPresetDisplayInfo(): PresetDisplayInfo | null {
  const customPreset = getCustomPreset();
  
  if (!customPreset || !customPreset.exists) {
    return null;
  }
  
  return {
    id: 'custom',
    name: customPreset.name,
    rounds: customPreset.config.totalRounds,
    workDuration: customPreset.config.workDuration,
    restDuration: customPreset.config.restDuration,
    totalTime: calculateTotalTime(customPreset.config),
    color: 'from-indigo-500 to-purple-600', // Distinctive color for custom preset
    icon: null, // Will be set to Target icon in component
    difficulty: 0, // Special indicator for custom preset
    isCustom: true
  };
}

/**
 * Check if current timer config matches any standard preset
 * 
 * Used to determine if current configuration is a standard preset
 * or a custom/temporary configuration
 */
export function isStandardPresetConfig(config: TimerConfig): PresetType | null {
  // Standard preset configurations (match timer-engine.ts)
  const standardPresets = {
    beginner: {
      workDuration: 120,
      restDuration: 60,
      totalRounds: 3,
      enableWarning: true,
      prepDuration: 10
    },
    intermediate: {
      workDuration: 180,
      restDuration: 60,
      totalRounds: 5,
      enableWarning: true,
      prepDuration: 10
    },
    advanced: {
      workDuration: 180,
      restDuration: 60,
      totalRounds: 12,
      enableWarning: true,
      prepDuration: 5
    }
  };
  
  // Check each standard preset for match
  for (const [presetKey, presetConfig] of Object.entries(standardPresets)) {
    if (
      config.workDuration === presetConfig.workDuration &&
      config.restDuration === presetConfig.restDuration &&
      config.totalRounds === presetConfig.totalRounds &&
      (config.prepDuration ?? 10) === presetConfig.prepDuration
    ) {
      return presetKey as 'beginner' | 'intermediate' | 'advanced';
    }
  }
  
  return null;
}

/**
 * Migrate existing timer config to custom preset
 * 
 * Business Context:
 * - Helps users preserve their existing custom configurations
 * - Provides smooth transition to new preset system
 * - Only creates custom preset if config doesn't match standard presets
 * 
 * @param defaultName - Default name to use for the custom preset
 * @returns true if migration created a custom preset, false if config matched standard preset
 */
export function migrateExistingConfig(defaultName: string = 'My Custom Preset'): boolean {
  try {
    // Check if custom preset already exists
    const existing = getCustomPreset();
    if (existing && existing.exists) {
      return false; // Already migrated
    }
    
    // Get current timer config
    const stored = localStorage.getItem(STORAGE_KEYS.TIMER_CONFIG);
    if (!stored) {
      return false; // No existing config to migrate
    }
    
    const config = JSON.parse(stored) as TimerConfig;
    
    // Check if config matches a standard preset
    if (isStandardPresetConfig(config)) {
      return false; // Standard preset, no migration needed
    }
    
    // Create custom preset from existing config
    createCustomPreset(defaultName, config);
    
    return true;
  } catch (error) {
    console.warn('Failed to migrate existing config:', error);
    return false;
  }
}

/**
 * Get configuration limits for validation in UI components
 */
export function getPresetLimits() {
  return PRESET_LIMITS;
}

/**
 * Export storage keys for use in other modules
 */
export { STORAGE_KEYS };