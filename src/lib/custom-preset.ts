/**
 * Custom Preset Management System
 * 
 * Handles creation, storage, and management of user-defined custom presets
 * for the boxing timer application. Provides utilities for persisting custom
 * workout configurations alongside standard presets.
 */

import React from 'react';
import { TimerConfig } from './timer-engine';

// Extended preset type to include custom
export type PresetType = 'beginner' | 'intermediate' | 'advanced' | 'custom';

/**
 * Custom preset data structure with metadata
 */
export interface CustomPreset {
  exists: boolean;
  name: string;
  config: TimerConfig;
  createdAt: string;
  lastModified: string;
  lastUsed?: string;
  version: number;
}

/**
 * Preset display information for UI components
 */
export interface PresetDisplayInfo {
  id: string;
  name: string;
  rounds: number;
  workDuration: number;
  restDuration: number;
  totalTime: string;
  color: string;
  icon: React.ComponentType<{ className?: string }> | null;
  difficulty: number;
  isCustom: boolean;
}

// Storage keys
const STORAGE_KEYS = {
  CUSTOM_PRESET: 'boxing-timer-custom-preset',
  TIMER_CONFIG: 'boxing-timer-config',
} as const;

// Validation limits
const PRESET_LIMITS = {
  name: { minLength: 1, maxLength: 30 },
  rounds: { min: 1, max: 20 },
  workDuration: { min: 10, max: 600 },
  restDuration: { min: 10, max: 300 },
  prepDuration: { min: 0, max: 60 },
} as const;

/**
 * Custom validation errors
 */
export class CustomPresetValidationError extends Error {
  constructor(field: string, message: string) {
    super(`${field}: ${message}`);
    this.name = 'CustomPresetValidationError';
  }
}

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
 */
function validatePresetName(name: string): void {
  const trimmedName = name.trim();
  
  if (trimmedName.length < PRESET_LIMITS.name.minLength) {
    throw new CustomPresetValidationError('name', 'Name cannot be empty');
  }
  
  if (trimmedName.length > PRESET_LIMITS.name.maxLength) {
    throw new CustomPresetValidationError('name', `Name cannot exceed ${PRESET_LIMITS.name.maxLength} characters`);
  }
  
  const standardPresetNames = ['beginner', 'intermediate', 'advanced'];
  if (standardPresetNames.includes(trimmedName.toLowerCase())) {
    throw new CustomPresetValidationError('name', 'Cannot use standard preset names');
  }
}

/**
 * Validate timer configuration
 */
function validateTimerConfig(config: TimerConfig): void {
  if (config.totalRounds < PRESET_LIMITS.rounds.min || config.totalRounds > PRESET_LIMITS.rounds.max) {
    throw new CustomPresetValidationError(
      'totalRounds', 
      `Must be between ${PRESET_LIMITS.rounds.min} and ${PRESET_LIMITS.rounds.max}`
    );
  }
  
  if (config.workDuration < PRESET_LIMITS.workDuration.min || config.workDuration > PRESET_LIMITS.workDuration.max) {
    throw new CustomPresetValidationError(
      'workDuration', 
      `Must be between ${PRESET_LIMITS.workDuration.min} and ${PRESET_LIMITS.workDuration.max} seconds`
    );
  }
  
  if (config.restDuration < PRESET_LIMITS.restDuration.min || config.restDuration > PRESET_LIMITS.restDuration.max) {
    throw new CustomPresetValidationError(
      'restDuration', 
      `Must be between ${PRESET_LIMITS.restDuration.min} and ${PRESET_LIMITS.restDuration.max} seconds`
    );
  }
  
  const prepDuration = config.prepDuration ?? 10;
  if (prepDuration < PRESET_LIMITS.prepDuration.min || prepDuration > PRESET_LIMITS.prepDuration.max) {
    throw new CustomPresetValidationError(
      'prepDuration', 
      `Must be between ${PRESET_LIMITS.prepDuration.min} and ${PRESET_LIMITS.prepDuration.max} seconds`
    );
  }
}

/**
 * Calculate total workout time
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
 */
export function createCustomPreset(name: string, config: TimerConfig): CustomPreset {
  validatePresetName(name);
  validateTimerConfig(config);
  
  const now = new Date().toISOString();
  
  const customPreset: CustomPreset = {
    exists: true,
    name: name.trim(),
    config: { ...config },
    createdAt: now,
    lastModified: now,
    version: 1
  };
  
  try {
    if (typeof window === 'undefined') {
      throw new Error('Cannot access localStorage in server environment');
    }
    
    localStorage.setItem(STORAGE_KEYS.CUSTOM_PRESET, JSON.stringify(customPreset));
    return customPreset;
  } catch (error) {
    throw new CustomPresetStorageError('create', error as Error);
  }
}

/**
 * Update existing custom preset
 */
export function updateCustomPreset(name: string, config: TimerConfig): CustomPreset {
  const existing = getCustomPreset();
  
  if (!existing || !existing.exists) {
    throw new CustomPresetStorageError('update', new Error('No custom preset exists to update'));
  }
  
  validatePresetName(name);
  validateTimerConfig(config);
  
  const updatedPreset: CustomPreset = {
    ...existing,
    name: name.trim(),
    config: { ...config },
    lastModified: new Date().toISOString()
  };
  
  try {
    if (typeof window === 'undefined') {
      throw new Error('Cannot access localStorage in server environment');
    }
    
    localStorage.setItem(STORAGE_KEYS.CUSTOM_PRESET, JSON.stringify(updatedPreset));
    return updatedPreset;
  } catch (error) {
    throw new CustomPresetStorageError('update', error as Error);
  }
}

/**
 * Get current custom preset from storage
 */
export function getCustomPreset(): CustomPreset | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CUSTOM_PRESET);
    
    if (!stored) {
      return null;
    }
    
    const parsed = JSON.parse(stored) as CustomPreset;
    
    if (!parsed.exists || !parsed.name || !parsed.config) {
      throw new Error('Invalid custom preset data structure');
    }
    
    return parsed;
  } catch (error) {
    console.warn('Failed to load custom preset:', error);
    return null;
  }
}

/**
 * Mark custom preset as used
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
    console.warn('Failed to update custom preset usage:', error);
  }
}

/**
 * Delete custom preset
 */
export function deleteCustomPreset(): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.CUSTOM_PRESET);
    }
  } catch (error) {
    throw new CustomPresetStorageError('delete', error as Error);
  }
}

/**
 * Convert custom preset to display info
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
    color: 'from-indigo-500 to-purple-600',
    icon: null,
    difficulty: 0,
    isCustom: true
  };
}

/**
 * Check if current config matches a standard preset
 */
export function isStandardPresetConfig(config: TimerConfig): PresetType | null {
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
 * Get configuration limits for UI validation
 */
export function getPresetLimits() {
  return PRESET_LIMITS;
}

export { STORAGE_KEYS };