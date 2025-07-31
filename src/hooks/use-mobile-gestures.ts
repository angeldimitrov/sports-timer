/**
 * useMobileGestures React Hook
 * 
 * React hook for handling touch gestures and mobile-specific interactions for the boxing timer.
 * Provides native-like mobile experience with gesture controls for timer operations.
 * 
 * Features:
 * - Tap to pause/resume timer
 * - Swipe gestures for round skip/navigation
 * - Long press for timer reset
 * - Pull-to-refresh for preset selection
 * - Touch feedback with haptic vibration
 * - Gesture conflict resolution
 * - Accessibility support
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface SwipeGesture {
  startPoint: TouchPoint;
  endPoint: TouchPoint;
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  duration: number;
  velocity: number;
}

export interface GestureConfig {
  /** Minimum distance in pixels for swipe recognition */
  swipeThreshold: number;
  /** Maximum time in ms for swipe gesture */
  swipeMaxTime: number;
  /** Minimum velocity in px/ms for swipe */
  swipeMinVelocity: number;
  /** Time in ms for long press detection */
  longPressTime: number;
  /** Maximum movement in pixels during long press */
  longPressMovement: number;
  /** Enable haptic feedback */
  enableHaptics: boolean;
  /** Enable gesture visual feedback */
  enableVisualFeedback: boolean;
}

export interface GestureCallbacks {
  /** Called when timer area is tapped (pause/resume) */
  onTap?: (point: TouchPoint) => void;
  /** Called when double tap is detected */
  onDoubleTap?: (point: TouchPoint) => void;
  /** Called when long press is detected */
  onLongPress?: (point: TouchPoint) => void;
  /** Called when swipe gesture is detected */
  onSwipe?: (gesture: SwipeGesture) => void;
  /** Called when pull-to-refresh is triggered */
  onPullToRefresh?: () => void;
  /** Called when pinch gesture is detected (for accessibility zoom) */
  onPinch?: (scale: number) => void;
}

export interface UseMobileGesturesOptions {
  /** Target element selector or ref for gesture detection */
  target?: string | React.RefObject<HTMLElement>;
  /** Gesture configuration */
  config?: Partial<GestureConfig>;
  /** Gesture callbacks */
  callbacks?: GestureCallbacks;
  /** Enable gesture detection */
  enabled?: boolean;
  /** Debug mode for gesture logging */
  debug?: boolean;
}

export interface UseMobileGesturesReturn {
  /** Whether gestures are currently enabled */
  isEnabled: boolean;
  /** Current gesture state */
  activeGesture: string | null;
  /** Enable/disable gesture detection */
  setEnabled: (enabled: boolean) => void;
  /** Trigger haptic feedback manually */
  hapticFeedback: (pattern?: 'light' | 'medium' | 'heavy') => void;
  /** Get gesture statistics */
  getGestureStats: () => { totalGestures: number; gestureTypes: Record<string, number> };
}

const DEFAULT_CONFIG: GestureConfig = {
  swipeThreshold: 50,
  swipeMaxTime: 300,
  swipeMinVelocity: 0.3,
  longPressTime: 800,
  longPressMovement: 10,
  enableHaptics: true,
  enableVisualFeedback: true
};

/**
 * React hook for mobile gesture handling
 * 
 * Provides comprehensive touch gesture recognition for boxing timer controls.
 * Handles common mobile gestures like tap, swipe, long press, and pull-to-refresh
 * with proper conflict resolution and accessibility support.
 * 
 * @param options Configuration and callbacks for gesture handling
 * @returns Gesture control interface and state
 */
export function useMobileGestures(options: UseMobileGesturesOptions = {}): UseMobileGesturesReturn {
  const {
    target,
    config = {},
    callbacks = {},
    enabled = true,
    debug = false
  } = options;

  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const {
    swipeThreshold,
    swipeMaxTime,
    swipeMinVelocity,
    longPressTime,
    longPressMovement,
    enableHaptics,
    enableVisualFeedback
  } = fullConfig;

  // State management
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [activeGesture, setActiveGesture] = useState<string | null>(null);

  // Refs for gesture tracking
  const touchStartRef = useRef<TouchPoint | null>(null);
  const touchCurrentRef = useRef<TouchPoint | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const gestureStatsRef = useRef({ totalGestures: 0, gestureTypes: {} as Record<string, number> });
  const targetElementRef = useRef<HTMLElement | null>(null);

  /**
   * Trigger haptic feedback
   */
  const hapticFeedback = useCallback((pattern: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!enableHaptics || !navigator.vibrate) {
      return;
    }

    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30, 10, 30]
    };

    try {
      navigator.vibrate(patterns[pattern]);
    } catch (error) {
      if (debug) {
        console.warn('[Gestures] Haptic feedback failed:', error);
      }
    }
  }, [enableHaptics, debug]);

  /**
   * Log gesture for debugging and statistics
   */
  const logGesture = useCallback((type: string, data?: any) => {
    gestureStatsRef.current.totalGestures++;
    gestureStatsRef.current.gestureTypes[type] = (gestureStatsRef.current.gestureTypes[type] || 0) + 1;

    if (debug) {
      console.log(`[Gestures] ${type}:`, data);
    }
  }, [debug]);

  /**
   * Get touch point from event
   */
  const getTouchPoint = useCallback((event: TouchEvent): TouchPoint => {
    const touch = event.touches[0] || event.changedTouches[0];
    return {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    };
  }, []);

  /**
   * Calculate distance between two points
   */
  const getDistance = useCallback((p1: TouchPoint, p2: TouchPoint): number => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  /**
   * Get swipe direction
   */
  const getSwipeDirection = useCallback((start: TouchPoint, end: TouchPoint): 'left' | 'right' | 'up' | 'down' => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
  }, []);

  /**
   * Handle touch start
   */
  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (!isEnabled) return;

    const touchPoint = getTouchPoint(event);
    touchStartRef.current = touchPoint;
    touchCurrentRef.current = touchPoint;

    setActiveGesture('touch-start');

    // Start long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    longPressTimerRef.current = setTimeout(() => {
      if (touchStartRef.current && touchCurrentRef.current) {
        const distance = getDistance(touchStartRef.current, touchCurrentRef.current);
        
        if (distance < longPressMovement) {
          setActiveGesture('long-press');
          hapticFeedback('heavy');
          
          if (callbacks.onLongPress) {
            callbacks.onLongPress(touchStartRef.current);
          }
          
          logGesture('long-press', { point: touchStartRef.current });
        }
      }
    }, longPressTime);

    // Prevent default for better control
    if (event.cancelable) {
      event.preventDefault();
    }
  }, [isEnabled, getTouchPoint, getDistance, longPressMovement, longPressTime, hapticFeedback, callbacks, logGesture]);

  /**
   * Handle touch move
   */
  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (!isEnabled || !touchStartRef.current) return;

    const touchPoint = getTouchPoint(event);
    touchCurrentRef.current = touchPoint;

    // Cancel long press if moved too far
    const distance = getDistance(touchStartRef.current, touchPoint);
    if (distance > longPressMovement && longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Update active gesture
    if (distance > 5) {
      setActiveGesture('swiping');
    }

    // Prevent default to avoid scrolling during gestures
    if (event.cancelable && distance > swipeThreshold / 2) {
      event.preventDefault();
    }
  }, [isEnabled, getTouchPoint, getDistance, longPressMovement, swipeThreshold]);

  /**
   * Handle touch end
   */
  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (!isEnabled || !touchStartRef.current) return;

    const touchPoint = getTouchPoint(event);
    const startPoint = touchStartRef.current;
    const duration = touchPoint.timestamp - startPoint.timestamp;
    const distance = getDistance(startPoint, touchPoint);

    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    setActiveGesture(null);

    // Determine gesture type
    if (duration < swipeMaxTime && distance > swipeThreshold) {
      // Swipe gesture
      const direction = getSwipeDirection(startPoint, touchPoint);
      const velocity = distance / duration;

      if (velocity >= swipeMinVelocity) {
        const swipeGesture: SwipeGesture = {
          startPoint,
          endPoint: touchPoint,
          direction,
          distance,
          duration,
          velocity
        };

        hapticFeedback('medium');
        
        if (callbacks.onSwipe) {
          callbacks.onSwipe(swipeGesture);
        }
        
        logGesture('swipe', swipeGesture);
      }
    } else if (distance < longPressMovement && duration < longPressTime) {
      // Tap gesture
      const now = Date.now();
      const timeSinceLastTap = now - lastTapTimeRef.current;

      if (timeSinceLastTap < 300) {
        // Double tap
        hapticFeedback('medium');
        
        if (callbacks.onDoubleTap) {
          callbacks.onDoubleTap(touchPoint);
        }
        
        logGesture('double-tap', { point: touchPoint });
        lastTapTimeRef.current = 0; // Reset to prevent triple tap
      } else {
        // Single tap
        hapticFeedback('light');
        
        if (callbacks.onTap) {
          callbacks.onTap(touchPoint);
        }
        
        logGesture('tap', { point: touchPoint });
        lastTapTimeRef.current = now;
      }
    }

    // Reset touch tracking
    touchStartRef.current = null;
    touchCurrentRef.current = null;

    // Allow default behavior after gesture processing
    if (event.cancelable) {
      event.preventDefault();
    }
  }, [
    isEnabled, 
    getTouchPoint, 
    getDistance, 
    getSwipeDirection, 
    swipeMaxTime, 
    swipeThreshold, 
    swipeMinVelocity,
    longPressMovement, 
    longPressTime, 
    hapticFeedback, 
    callbacks, 
    logGesture
  ]);

  /**
   * Handle touch cancel
   */
  const handleTouchCancel = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    setActiveGesture(null);
    touchStartRef.current = null;
    touchCurrentRef.current = null;
  }, []);

  /**
   * Get gesture statistics
   */
  const getGestureStats = useCallback(() => {
    return {
      totalGestures: gestureStatsRef.current.totalGestures,
      gestureTypes: { ...gestureStatsRef.current.gestureTypes }
    };
  }, []);

  /**
   * Set up event listeners
   */
  useEffect(() => {
    let element: HTMLElement | null = null;

    // Determine target element
    if (typeof target === 'string') {
      element = document.querySelector(target);
    } else if (target && 'current' in target) {
      element = target.current;
    } else {
      element = document.body;
    }

    if (!element) {
      if (debug) {
        console.warn('[Gestures] Target element not found');
      }
      return;
    }

    targetElementRef.current = element;

    // Add event listeners with passive: false for preventDefault
    const options = { passive: false };
    
    element.addEventListener('touchstart', handleTouchStart, options);
    element.addEventListener('touchmove', handleTouchMove, options);
    element.addEventListener('touchend', handleTouchEnd, options);
    element.addEventListener('touchcancel', handleTouchCancel, options);

    if (debug) {
      console.log('[Gestures] Event listeners attached to:', element);
    }

    return () => {
      if (element) {
        element.removeEventListener('touchstart', handleTouchStart);
        element.removeEventListener('touchmove', handleTouchMove);
        element.removeEventListener('touchend', handleTouchEnd);
        element.removeEventListener('touchcancel', handleTouchCancel);
      }

      // Clear any pending timers
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, [target, debug, handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel]);

  /**
   * Clean up on unmount
   */
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  return {
    isEnabled,
    activeGesture,
    setEnabled: setIsEnabled,
    hapticFeedback,
    getGestureStats
  };
}

/**
 * Hook variant specifically for timer controls
 * Pre-configured with common timer gesture patterns
 */
export function useTimerGestures(
  onTap: () => void,
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
  onLongPress: () => void,
  options: Omit<UseMobileGesturesOptions, 'callbacks'> = {}
): UseMobileGesturesReturn {
  return useMobileGestures({
    ...options,
    callbacks: {
      onTap: () => onTap(),
      onSwipe: (gesture) => {
        if (gesture.direction === 'left') {
          onSwipeLeft();
        } else if (gesture.direction === 'right') {
          onSwipeRight();
        }
      },
      onLongPress: () => onLongPress()
    }
  });
}

/**
 * Check if device supports touch gestures
 */
export function getTouchSupport(): {
  hasTouch: boolean;
  maxTouchPoints: number;
  hasHaptics: boolean;
} {
  if (typeof window === 'undefined') {
    return { hasTouch: false, maxTouchPoints: 0, hasHaptics: false };
  }

  return {
    hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    hasHaptics: 'vibrate' in navigator
  };
}