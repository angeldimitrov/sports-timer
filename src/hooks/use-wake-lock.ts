/**
 * useWakeLock React Hook
 * 
 * React hook for managing Screen Wake Lock API to prevent screen from turning off during workouts.
 * Essential for boxing timer to maintain visibility during training sessions.
 * 
 * Features:
 * - Automatic wake lock during timer running state
 * - Battery-conscious implementation with proper cleanup
 * - Fallback handling for unsupported browsers
 * - Error handling and recovery
 * - Manual control for advanced use cases
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { createModuleLogger } from '../lib/logger';

const log = createModuleLogger('useWakeLock');

// Wake Lock types are defined in src/types/wake-lock.d.ts

export interface UseWakeLockOptions {
  /** Automatically request wake lock when condition is met */
  autoLock?: boolean;
  /** Condition for automatic wake lock (e.g., timer is running) */
  lockCondition?: boolean;
  /** Callback when wake lock is acquired */
  onLockAcquired?: () => void;
  /** Callback when wake lock is released */
  onLockReleased?: () => void;
  /** Callback when wake lock encounters an error */
  onError?: (error: Error) => void;
}

export interface UseWakeLockReturn {
  /** Whether wake lock is currently active */
  isLocked: boolean;
  /** Whether Wake Lock API is supported */
  isSupported: boolean;
  /** Current error state */
  error: Error | null;
  /** Manually request wake lock */
  requestWakeLock: () => Promise<boolean>;
  /** Manually release wake lock */
  releaseWakeLock: () => Promise<void>;
  /** Toggle wake lock state */
  toggleWakeLock: () => Promise<void>;
}

/**
 * React hook for Screen Wake Lock management
 * 
 * Prevents the screen from turning off during boxing workouts by using the
 * Screen Wake Lock API. Automatically manages wake lock based on timer state
 * and provides manual controls for advanced use cases.
 * 
 * @param options Configuration options for wake lock behavior
 * @returns Wake lock control interface and state
 */
export function useWakeLock(options: UseWakeLockOptions = {}): UseWakeLockReturn {
  const {
    autoLock = true,
    lockCondition = false,
    onLockAcquired,
    onLockReleased,
    onError
  } = options;

  // State management
  const [isLocked, setIsLocked] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Refs for stable references
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const isRequestingRef = useRef(false);

  /**
   * Check if Wake Lock API is supported
   */
  const checkSupport = useCallback(() => {
    const supported = 'wakeLock' in navigator && 'request' in (navigator.wakeLock || {});
    setIsSupported(supported);
    return supported;
  }, []);

  /**
   * Handle wake lock release event
   */
  const handleWakeLockRelease = useCallback(() => {
    log.debug('Wake lock released');
    setIsLocked(false);
    wakeLockRef.current = null;
    
    if (onLockReleased) {
      onLockReleased();
    }
  }, [onLockReleased]);

  /**
   * Request wake lock
   */
  const requestWakeLock = useCallback(async (): Promise<boolean> => {
    // Prevent concurrent requests
    if (isRequestingRef.current || wakeLockRef.current) {
      return isLocked;
    }

    // Check support directly to avoid dependency loop
    const supported = 'wakeLock' in navigator && 'request' in (navigator.wakeLock || {});
    if (!supported) {
      const error = new Error('Wake Lock API not supported');
      setError(error);
      if (onError) onError(error);
      return false;
    }

    isRequestingRef.current = true;
    setError(null);

    try {
      const wakeLock = await navigator.wakeLock!.request('screen');
      
      // Set up release event listener
      wakeLock.addEventListener('release', handleWakeLockRelease);
      
      wakeLockRef.current = wakeLock;
      setIsLocked(true);
      
      log.debug('Wake lock acquired');
      
      if (onLockAcquired) {
        onLockAcquired();
      }
      
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to acquire wake lock');
      log.warn('Failed to acquire wake lock:', error);
      
      setError(error);
      if (onError) {
        onError(error);
      }
      
      return false;
    } finally {
      isRequestingRef.current = false;
    }
  }, [isLocked, onLockAcquired, onError, handleWakeLockRelease]);

  /**
   * Release wake lock
   */
  const releaseWakeLock = useCallback(async (): Promise<void> => {
    if (!wakeLockRef.current) {
      return;
    }

    try {
      await wakeLockRef.current.release();
      // handleWakeLockRelease will be called automatically via event listener
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to release wake lock');
      log.warn('Failed to release wake lock:', error);
      
      // Force cleanup even if release failed
      setIsLocked(false);
      wakeLockRef.current = null;
      
      setError(error);
      if (onError) {
        onError(error);
      }
    }
  }, [onError]);

  /**
   * Toggle wake lock state
   */
  const toggleWakeLock = useCallback(async (): Promise<void> => {
    if (isLocked) {
      await releaseWakeLock();
    } else {
      await requestWakeLock();
    }
  }, [isLocked, requestWakeLock, releaseWakeLock]);

  /**
   * Handle document visibility changes
   * Wake lock is automatically released when page becomes hidden
   */
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden && isLocked) {
        log.debug('Page hidden, wake lock will be released automatically');
      } else if (!document.hidden && autoLock && lockCondition && !isLocked) {
        // Re-acquire wake lock when page becomes visible and conditions are met
        log.debug('Page visible, re-acquiring wake lock');
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isLocked, autoLock, lockCondition, requestWakeLock]);

  /**
   * Handle automatic wake lock based on condition
   */
  useEffect(() => {
    if (!autoLock) {
      return;
    }

    const handleAutoLock = async () => {
      if (lockCondition && !isLocked) {
        log.debug('Auto-acquiring wake lock (condition met)');
        await requestWakeLock();
      } else if (!lockCondition && isLocked) {
        log.debug('Auto-releasing wake lock (condition not met)');
        await releaseWakeLock();
      }
    };

    handleAutoLock();
  }, [autoLock, lockCondition, isLocked, requestWakeLock, releaseWakeLock]);

  /**
   * Initialize support check and cleanup on unmount
   */
  useEffect(() => {
    checkSupport();

    return () => {
      // Cleanup on unmount
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(err => {
          log.warn('Cleanup release failed:', err);
        });
      }
    };
  }, [checkSupport]);

  return {
    isLocked,
    isSupported,
    error,
    requestWakeLock,
    releaseWakeLock,
    toggleWakeLock
  };
}

/**
 * Hook variant specifically for timer applications
 * Automatically manages wake lock based on timer running state
 */
export function useTimerWakeLock(isTimerRunning: boolean): UseWakeLockReturn {
  return useWakeLock({
    autoLock: true,
    lockCondition: isTimerRunning,
    onLockAcquired: () => {
      log.info('Screen will stay on during workout');
    },
    onLockReleased: () => {
      log.info('Normal screen timeout restored');
    },
    onError: (error) => {
      log.warn('Wake lock not available:', error.message);
    }
  });
}

/**
 * Get wake lock support information
 */
export function getWakeLockSupport(): { 
  isSupported: boolean; 
  reason?: string;
} {
  if (typeof window === 'undefined') {
    return { isSupported: false, reason: 'Not in browser environment' };
  }

  if (!('wakeLock' in navigator)) {
    return { isSupported: false, reason: 'Wake Lock API not available' };
  }

  if (!navigator.wakeLock || !('request' in navigator.wakeLock)) {
    return { isSupported: false, reason: 'Wake Lock request method not available' };
  }

  // Additional checks for known limitations
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
    return { isSupported: false, reason: 'Wake Lock requires HTTPS or localhost' };
  }

  return { isSupported: true };
}