/**
 * useTimer React Hook
 * 
 * React hook for managing Boxing Timer state with Web Worker precision timing.
 * Provides a clean interface for timer control and state management in React components.
 * 
 * Business Context:
 * - Encapsulates timer engine complexity for easy component integration
 * - Manages timer lifecycle with proper cleanup on component unmount
 * - Provides reactive state updates for UI components
 * - Handles error states and recovery for robust user experience
 * - Supports preset configurations and custom timer settings
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  TimerEngine, 
  TimerConfig, 
  TimerState, 
  TimerEvent, 
  TimerEventHandler,
  createBoxingTimer 
} from '../lib/timer-engine';

export interface UseTimerOptions {
  /** Initial timer configuration */
  config?: TimerConfig;
  /** Preset configuration (overrides config if provided) */
  preset?: 'beginner' | 'intermediate' | 'advanced';
  /** Auto-start timer on initialization */
  autoStart?: boolean;
  /** Callback for timer events */
  onEvent?: (event: TimerEvent) => void;
}

export interface UseTimerReturn {
  // State
  /** Current timer state */
  state: TimerState;
  /** Current timer configuration */
  config: TimerConfig;
  /** Whether timer engine is initialized and ready */
  isReady: boolean;
  /** Error state if timer initialization failed */
  error: Error | null;

  // Control methods
  /** Start the timer */
  start: () => void;
  /** Pause the timer */
  pause: () => void;
  /** Resume paused timer */
  resume: () => void;
  /** Stop and reset timer */
  stop: () => void;
  /** Reset timer to initial state */
  reset: () => void;

  // Configuration
  /** Update timer configuration */
  updateConfig: (newConfig: Partial<TimerConfig>) => void;
  /** Load preset configuration */
  loadPreset: (preset: 'beginner' | 'intermediate' | 'advanced') => void;

  // Computed values
  /** Formatted time remaining (MM:SS) */
  formattedTimeRemaining: string;
  /** Formatted time elapsed (MM:SS) */
  formattedTimeElapsed: string;
  /** Whether timer is currently running */
  isRunning: boolean;
  /** Whether timer is paused */
  isPaused: boolean;
  /** Whether timer is idle */
  isIdle: boolean;
  /** Whether timer is completed */
  isCompleted: boolean;
  /** Whether currently in work phase */
  isWorkPhase: boolean;
  /** Whether currently in rest phase */
  isRestPhase: boolean;
}

/**
 * Default timer configuration for fallback
 */
const DEFAULT_CONFIG: TimerConfig = {
  workDuration: 180, // 3 minutes
  restDuration: 60,  // 1 minute
  totalRounds: 5,
  enableWarning: true
};

/**
 * Format milliseconds to MM:SS string
 */
function formatTime(milliseconds: number): string {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * React hook for Boxing Timer management
 * 
 * Provides complete timer control and state management with:
 * - Automatic cleanup on component unmount
 * - Reactive state updates from Web Worker
 * - Error handling and recovery
 * - Preset configurations
 * - Formatted time display utilities
 * 
 * @param options - Configuration options for the timer
 * @returns Timer control interface and state
 */
export function useTimer(options: UseTimerOptions = {}): UseTimerReturn {
  const {
    config: initialConfig,
    preset,
    autoStart = false,
    onEvent
  } = options;

  // State management
  const [state, setState] = useState<TimerState>({
    status: 'idle',
    phase: 'work',
    currentRound: 1,
    timeRemaining: 0,
    timeElapsed: 0,
    progress: 0,
    warningTriggered: false,
    workoutProgress: 0
  });

  const [config, setConfig] = useState<TimerConfig>(() => {
    if (preset) {
      // Will be set when timer initializes with preset
      return DEFAULT_CONFIG;
    }
    return initialConfig || DEFAULT_CONFIG;
  });

  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Refs for stable references
  const timerRef = useRef<TimerEngine | null>(null);
  const eventHandlerRef = useRef<TimerEventHandler | null>(null);

  /**
   * Initialize timer engine
   */
  const initializeTimer = useCallback((timerConfig: TimerConfig) => {
    try {
      // Clean up existing timer
      if (timerRef.current) {
        timerRef.current.destroy();
      }

      // Create new timer engine
      const timer = new TimerEngine(timerConfig);
      timerRef.current = timer;

      // Set up event handler
      const eventHandler: TimerEventHandler = (event: TimerEvent) => {
        // Force new object reference to ensure React re-renders
        setState({ ...event.state });

        // Forward event to external handler
        if (onEvent) {
          onEvent(event);
        }

        // Handle specific events
        switch (event.type) {
          case 'error':
            console.error('Timer error:', event.payload);
            setError(new Error(event.payload?.message || 'Timer error'));
            break;
        }
      };

      eventHandlerRef.current = eventHandler;
      timer.addEventListener(eventHandler);

      // Update local config state
      setConfig(timer.getConfig());
      setState(timer.getState());
      setError(null);
      setIsReady(true);

      return timer;
    } catch (err) {
      console.error('Failed to initialize timer:', err);
      setError(err instanceof Error ? err : new Error('Failed to initialize timer'));
      setIsReady(false);
      return null;
    }
  }, [onEvent]);

  /**
   * Initialize timer on mount
   */
  useEffect(() => {
    let initialTimerConfig: TimerConfig;

    if (preset) {
      // Create timer with preset to get the config
      const presetTimer = createBoxingTimer(preset);
      initialTimerConfig = presetTimer.getConfig();
      presetTimer.destroy(); // Clean up temporary timer
    } else {
      initialTimerConfig = initialConfig || DEFAULT_CONFIG;
    }

    const timer = initializeTimer(initialTimerConfig);

    // Auto-start if requested
    if (autoStart && timer) {
      timer.start();
    }

    return () => {
      if (timerRef.current) {
        timerRef.current.destroy();
        timerRef.current = null;
      }
      setIsReady(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - dependencies cause infinite loops

  // Control methods
  const start = useCallback(() => {
    if (timerRef.current && isReady) {
      timerRef.current.start();
    }
  }, [isReady]);

  const pause = useCallback(() => {
    if (timerRef.current && isReady) {
      timerRef.current.pause();
    }
  }, [isReady]);

  const resume = useCallback(() => {
    if (timerRef.current && isReady) {
      timerRef.current.resume();
    }
  }, [isReady]);

  const stop = useCallback(() => {
    if (timerRef.current && isReady) {
      timerRef.current.stop();
    }
  }, [isReady]);

  const reset = useCallback(() => {
    if (timerRef.current && isReady) {
      timerRef.current.reset();
    }
  }, [isReady]);

  const updateConfig = useCallback((newConfig: Partial<TimerConfig>) => {
    if (timerRef.current && isReady) {
      timerRef.current.updateConfig(newConfig);
      setConfig(timerRef.current.getConfig());
    }
  }, [isReady]);

  const loadPreset = useCallback((presetName: 'beginner' | 'intermediate' | 'advanced') => {
    try {
      // Create temporary timer to get preset config
      const presetTimer = createBoxingTimer(presetName);
      const presetConfig = presetTimer.getConfig();
      presetTimer.destroy();

      // Reinitialize with preset config
      const timer = initializeTimer(presetConfig);
      
      if (!timer) {
        throw new Error('Failed to initialize timer with preset');
      }
    } catch (err) {
      console.error('Failed to load preset:', err);
      setError(err instanceof Error ? err : new Error('Failed to load preset'));
    }
  }, [initializeTimer]);

  // Computed values
  const formattedTimeRemaining = formatTime(state.timeRemaining);
  const formattedTimeElapsed = formatTime(state.timeElapsed);
  const isRunning = state.status === 'running';
  const isPaused = state.status === 'paused';
  const isIdle = state.status === 'idle';
  const isCompleted = state.status === 'completed';
  const isWorkPhase = state.phase === 'work';
  const isRestPhase = state.phase === 'rest';

  return {
    // State
    state,
    config,
    isReady,
    error,

    // Control methods
    start,
    pause,
    resume,
    stop,
    reset,

    // Configuration
    updateConfig,
    loadPreset,

    // Computed values
    formattedTimeRemaining,
    formattedTimeElapsed,
    isRunning,
    isPaused,
    isIdle,
    isCompleted,
    isWorkPhase,
    isRestPhase
  };
}

/**
 * Hook variant with preset configuration
 */
export function useBoxingTimer(preset: 'beginner' | 'intermediate' | 'advanced', options: Omit<UseTimerOptions, 'preset'> = {}): UseTimerReturn {
  return useTimer({ ...options, preset });
}

/**
 * Hook variant with custom configuration
 */
export function useCustomTimer(config: TimerConfig, options: Omit<UseTimerOptions, 'config'> = {}): UseTimerReturn {
  return useTimer({ ...options, config });
}