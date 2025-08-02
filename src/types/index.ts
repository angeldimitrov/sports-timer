/**
 * TypeScript Types Export Index for Boxing Timer
 * 
 * Centralized exports for core type definitions used throughout the application.
 */

// Re-export types from timer engine
export type {
  TimerStatus,
  TimerPhase,
  TimerConfig,
  TimerState,
  TimerEvent,
  TimerEventHandler
} from '../lib/timer-engine';

// Re-export types from hooks
export type {
  UseTimerOptions,
  UseTimerReturn
} from '../hooks/use-timer';

// Re-export audio types
export type {
  AudioType
} from '../lib/audio-manager';

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireProps<T, K extends keyof T> = T & Required<Pick<T, K>>;