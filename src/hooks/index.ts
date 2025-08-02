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