/**
 * Utility functions for Boxing Timer MVP
 * 
 * Common utilities for time formatting, validation, and helper functions
 * used throughout the timer application.
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { TimerConfig } from './timer-engine';

/**
 * Utility function for merging Tailwind CSS classes
 * Used by shadcn/ui components for conditional styling
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format milliseconds to MM:SS string
 * @param milliseconds - Time in milliseconds
 * @returns Formatted time string (MM:SS)
 */
export function formatTime(milliseconds: number): string {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format milliseconds to M:SS string (shorter format)
 * @param milliseconds - Time in milliseconds
 * @returns Formatted time string (M:SS)
 */
export function formatTimeShort(milliseconds: number): string {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Parse time string (MM:SS or M:SS) to seconds
 * @param timeString - Time string in MM:SS or M:SS format
 * @returns Time in seconds, or null if invalid format
 */
export function parseTimeToSeconds(timeString: string): number | null {
  const match = timeString.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);

  if (seconds >= 60) {
    return null; // Invalid seconds
  }

  return minutes * 60 + seconds;
}

/**
 * Validate timer configuration
 * @param config - Timer configuration to validate
 * @returns Validation result with errors if any
 */
export function validateTimerConfig(config: TimerConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate work duration (1-10 minutes)
  if (config.workDuration < 60 || config.workDuration > 600) {
    errors.push('Work duration must be between 1 and 10 minutes');
  }

  // Validate rest duration (15 seconds - 5 minutes)
  if (config.restDuration < 15 || config.restDuration > 300) {
    errors.push('Rest duration must be between 15 seconds and 5 minutes');
  }

  // Validate total rounds (1-20)
  if (config.totalRounds < 1 || config.totalRounds > 20) {
    errors.push('Total rounds must be between 1 and 20');
  }

  // Ensure work duration is longer than rest duration for most cases
  if (config.workDuration < config.restDuration && config.workDuration > 60) {
    errors.push('Work duration should typically be longer than rest duration');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Calculate total workout duration in milliseconds
 * @param config - Timer configuration
 * @returns Total workout duration in milliseconds
 */
export function calculateTotalWorkoutDuration(config: TimerConfig): number {
  const workTime = config.workDuration * config.totalRounds * 1000;
  const restTime = config.restDuration * (config.totalRounds - 1) * 1000; // No rest after last round
  return workTime + restTime;
}

/**
 * Format total workout duration to human-readable string
 * @param config - Timer configuration
 * @returns Formatted duration string (e.g., "15 minutes", "1 hour 30 minutes")
 */
export function formatWorkoutDuration(config: TimerConfig): string {
  const totalMs = calculateTotalWorkoutDuration(config);
  const totalMinutes = Math.ceil(totalMs / 60000);

  if (totalMinutes < 60) {
    return `${totalMinutes} minute${totalMinutes !== 1 ? 's' : ''}`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }

  return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

/**
 * Get preset configurations
 */
export const TIMER_PRESETS = {
  beginner: {
    name: 'Beginner',
    description: '3 rounds, 2 minutes work, 1 minute rest',
    config: {
      workDuration: 120,
      restDuration: 60,
      totalRounds: 3,
      enableWarning: true
    } as TimerConfig
  },
  intermediate: {
    name: 'Intermediate',
    description: '5 rounds, 3 minutes work, 1 minute rest',
    config: {
      workDuration: 180,
      restDuration: 60,
      totalRounds: 5,
      enableWarning: true
    } as TimerConfig
  },
  advanced: {
    name: 'Advanced',
    description: '12 rounds, 3 minutes work, 1 minute rest',
    config: {
      workDuration: 180,
      restDuration: 60,
      totalRounds: 12,
      enableWarning: true
    } as TimerConfig
  }
} as const;

/**
 * Get preset configuration by name
 * @param presetName - Name of the preset
 * @returns Preset configuration or null if not found
 */
export function getPresetConfig(presetName: keyof typeof TIMER_PRESETS): TimerConfig | null {
  const preset = TIMER_PRESETS[presetName];
  return preset ? preset.config : null;
}

/**
 * Check if browser supports Web Workers
 * @returns True if Web Workers are supported
 */
export function supportsWebWorkers(): boolean {
  return typeof Worker !== 'undefined';
}

/**
 * Check if browser supports Web Audio API
 * @returns True if Web Audio API is supported
 */
export function supportsWebAudio(): boolean {
  return typeof AudioContext !== 'undefined' || typeof (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext !== 'undefined';
}

/**
 * Check if browser supports Page Visibility API
 * @returns True if Page Visibility API is supported
 */
export function supportsPageVisibility(): boolean {
  return typeof document !== 'undefined' && typeof document.hidden !== 'undefined';
}

/**
 * Get browser capabilities for timer features
 * @returns Object with capability flags
 */
export function getBrowserCapabilities() {
  return {
    webWorkers: supportsWebWorkers(),
    webAudio: supportsWebAudio(),
    pageVisibility: supportsPageVisibility(),
    highResolutionTime: typeof performance !== 'undefined' && typeof performance.now === 'function'
  };
}

/**
 * Convert seconds to milliseconds
 * @param seconds - Time in seconds
 * @returns Time in milliseconds
 */
export function secondsToMs(seconds: number): number {
  return seconds * 1000;
}

/**
 * Convert milliseconds to seconds
 * @param milliseconds - Time in milliseconds
 * @returns Time in seconds
 */
export function msToSeconds(milliseconds: number): number {
  return Math.floor(milliseconds / 1000);
}

/**
 * Clamp a number between min and max values
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Generate unique ID for timer instances
 * @returns Unique identifier string
 */
export function generateTimerId(): string {
  return `timer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Safe JSON parse with fallback
 * @param json - JSON string to parse
 * @param fallback - Fallback value if parsing fails
 * @returns Parsed object or fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}