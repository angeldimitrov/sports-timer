/**
 * useWorkoutFeedback Hook
 * 
 * Manages post-training feedback dialog state and timing.
 * Integrates with timer events to show feedback after workout completion.
 * 
 * Business Context:
 * - Shows feedback 4 seconds after workout completion
 * - Only appears for completed workouts (not manual stops)
 * - No data persistence in MVP (feedback not stored)
 * - Auto-dismisses after 15 seconds for non-intrusive UX
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { TimerEvent, TimerState, TimerConfig } from '@/lib/timer-engine';

export interface UseWorkoutFeedbackOptions {
  /** Delay before showing feedback after workout completion (ms) */
  showDelay?: number;
  /** Whether feedback is enabled */
  enabled?: boolean;
}

export interface UseWorkoutFeedbackReturn {
  /** Whether to show the feedback dialog */
  showFeedback: boolean;
  /** Current workout info for context */
  workoutInfo: {
    rounds: number;
    workDuration: number;
    restDuration: number;
    preset?: string;
  } | null;
  /** Handle timer event for triggering feedback */
  handleTimerEvent: (event: TimerEvent) => void;
  /** Close the feedback dialog */
  closeFeedback: () => void;
  /** Whether feedback feature is available */
  isAvailable: boolean;
}

/**
 * Hook for managing workout feedback dialog
 * 
 * Listens to timer events and shows feedback dialog after workout completion.
 * Provides state management and timing control for feedback collection.
 * 
 * @param options - Configuration options for feedback behavior
 * @returns Feedback state and control interface
 */
export function useWorkoutFeedback(
  options: UseWorkoutFeedbackOptions = {}
): UseWorkoutFeedbackReturn {
  const {
    showDelay = 4000, // 4 seconds after completion
    enabled = true
  } = options;

  const [showFeedback, setShowFeedback] = useState(false);
  const [workoutInfo, setWorkoutInfo] = useState<{
    rounds: number;
    workDuration: number;
    restDuration: number;
    preset?: string;
  } | null>(null);

  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wasManuallyStoppedRef = useRef(false);
  const lastStatusRef = useRef<TimerState['status']>('idle');

  /**
   * Handle timer events to trigger feedback
   */
  const handleTimerEvent = useCallback((event: TimerEvent) => {
    // Track manual stops to prevent feedback
    if (event.type === 'stop') {
      wasManuallyStoppedRef.current = true;
      // Clear any pending feedback
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
        showTimeoutRef.current = null;
      }
      return;
    }

    // Reset manual stop flag on start
    if (event.type === 'start') {
      wasManuallyStoppedRef.current = false;
      lastStatusRef.current = 'running';
      return;
    }

    // Track status changes
    if (event.state) {
      lastStatusRef.current = event.state.status;
    }

    // Show feedback on workout completion
    if (event.type === 'workoutComplete' && enabled && !wasManuallyStoppedRef.current) {
      // Store workout info from the event
      if (event.state && event.config) {
        setWorkoutInfo({
          rounds: event.config.totalRounds,
          workDuration: event.config.workDuration,
          restDuration: event.config.restDuration,
          preset: event.config.preset
        });
      }

      // Clear any existing timeout to prevent race conditions
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
      }

      // Schedule feedback dialog after delay
      showTimeoutRef.current = setTimeout(() => {
        setShowFeedback(true);
      }, showDelay);
    }
  }, [enabled, showDelay]);

  /**
   * Close the feedback dialog
   */
  const closeFeedback = useCallback(() => {
    setShowFeedback(false);
    setWorkoutInfo(null);
    wasManuallyStoppedRef.current = false;
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Check if feedback feature is available
   * Could be enhanced to check battery level, user preferences, etc.
   */
  const isAvailable = enabled;

  return {
    showFeedback,
    workoutInfo,
    handleTimerEvent,
    closeFeedback,
    isAvailable
  };
}

/**
 * Hook variant for simple feedback integration
 * 
 * Simplified API for basic feedback collection without customization.
 */
export function useSimpleFeedback(timerConfig?: TimerConfig) {
  const feedback = useWorkoutFeedback({ enabled: true });
  
  // Update workout info if timer config provided
  useEffect(() => {
    if (timerConfig && !feedback.workoutInfo) {
      // Can be used to pre-populate workout info
    }
  }, [timerConfig, feedback.workoutInfo]);

  return feedback;
}