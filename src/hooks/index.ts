/**
 * Hooks Exports Index
 */

// Core Timer Hooks
export { 
  useTimer, 
  useBoxingTimer, 
  useCustomTimer,
  type UseTimerOptions,
  type UseTimerReturn 
} from './use-timer';

// Audio System Hooks
export { 
  useAudio,
  type UseAudioReturn 
} from './use-audio';

// PWA and Mobile Hooks
export { 
  usePWA,
  type UsePWAOptions,
  type UsePWAReturn 
} from './use-pwa';

export { 
  useWakeLock,
  type UseWakeLockOptions,
  type UseWakeLockReturn 
} from './use-wake-lock';

export { 
  useMobileGestures,
  type UseMobileGesturesOptions,
  type UseMobileGesturesReturn 
} from './use-mobile-gestures';

// Utility Hooks
export { 
  useDebounceAutosave,
  useDebounce,
  type UseDebounceAutosaveOptions,
  type UseDebounceAutosaveReturn 
} from './use-debounced-autosave';

// Persistence Hooks
export { 
  usePresetPersistence,
  type UsePresetPersistenceReturn 
} from './use-preset-persistence';

// Feedback Hooks
export { 
  useWorkoutFeedback,
  type UseWorkoutFeedbackOptions,
  type UseWorkoutFeedbackReturn,
  type WorkoutSession,
  type FeedbackPreferences
} from './use-workout-feedback';