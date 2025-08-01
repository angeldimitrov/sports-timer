/**
 * TypeScript type definitions for Boxing Timer
 * 
 * Provides type safety for Web Worker messages and timer-related types
 */

// Web Worker message types for type safety
export interface TimerWorkerMessage {
  type: 'start' | 'pause' | 'resume' | 'stop' | 'reset' | 'status';
  payload?: {
    duration?: number;
    [key: string]: unknown;
  };
}

export interface TimerWorkerResponse {
  type: 'ready' | 'tick' | 'completed' | 'paused' | 'stopped' | 'reset' | 'status' | 'error';
  remaining?: number;
  elapsed?: number;
  progress?: number;
  timestamp?: number;
  isRunning?: boolean;
  isPaused?: boolean;
  duration?: number;
  message?: string;
  [key: string]: unknown;
}

// Extend global Worker type if needed
declare global {
  interface Worker {
    postMessage(message: TimerWorkerMessage): void;
  }
}

// Re-export main timer types for convenience
export type {
  TimerStatus,
  TimerPhase,
  TimerConfig,
  TimerState,
  TimerEvent,
  TimerEventHandler
} from '../lib/timer-engine';