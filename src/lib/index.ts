/**
 * Library Exports Index
 * 
 * Centralized exports for core business logic and utilities.
 */

// Core Timer Engine
export { 
  TimerEngine,
  createBoxingTimer,
  type TimerConfig,
  type TimerState,
  type TimerEvent,
  type TimerEventHandler,
  type TimerStatus,
  type TimerPhase 
} from './timer-engine';

// Audio System
export { 
  AudioManager,
  getAudioManager,
  type AudioType
} from './audio-manager';

export { 
  MobileAudioManager
} from './mobile-audio';

// Utilities
export { 
  cn,
  formatTime,
  parseTimeToSeconds,
  validateTimerConfig,
  calculateTotalWorkoutDuration,
  formatWorkoutDuration,
  clamp,
  generateTimerId,
  safeJsonParse
} from './utils';

// Path Utilities
export { getBasePath } from './get-base-path';

// Logging
export { 
  createModuleLogger
} from './logger';