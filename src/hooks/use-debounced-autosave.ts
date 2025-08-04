/**
 * Debounced Autosave Hook
 * 
 * Provides functionality for automatically saving data with debouncing to prevent
 * excessive save operations during rapid user input. Includes visual feedback
 * for successful saves and error handling.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseDebounceAutosaveOptions {
  /** Debounce delay in milliseconds (default: 500ms) */
  delay?: number;
  /** Whether to show save status feedback */
  showFeedback?: boolean;
}

export interface UseDebounceAutosaveReturn {
  /** Trigger an autosave operation */
  triggerSave: () => void;
  /** Current save status */
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  /** Whether a save operation is currently in progress */
  isSaving: boolean;
  /** Clear the current save status */
  clearStatus: () => void;
}

/**
 * Hook for implementing debounced autosave functionality
 * 
 * Features:
 * - Debounces save operations to prevent excessive calls
 * - Provides save status feedback for user experience
 * - Handles errors gracefully without disrupting workflow
 * - Automatic status clearing after successful saves
 * 
 * @param saveFunction - Function to call when saving data
 * @param options - Configuration options for debouncing and feedback
 * @returns Object with save trigger function and status information
 */
export function useDebounceAutosave(
  saveFunction: () => Promise<void> | void,
  options: UseDebounceAutosaveOptions = {}
): UseDebounceAutosaveReturn {
  const { delay = 500, showFeedback = true } = options;
  
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveRequestRef = useRef<boolean>(false);
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef<boolean>(true);

  /**
   * Execute the save operation with proper error handling and status updates
   */
  const executeSave = useCallback(async () => {
    try {
      if (!mountedRef.current) return;
      setSaveStatus('saving');
      
      // Execute the save function
      await saveFunction();
      
      if (!mountedRef.current) return;
      
      if (showFeedback) {
        setSaveStatus('saved');
        
        // Clear any existing status timeout
        if (statusTimeoutRef.current) {
          clearTimeout(statusTimeoutRef.current);
        }
        
        // Clear the "saved" status after 2 seconds
        statusTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            setSaveStatus('idle');
          }
        }, 2000);
      } else {
        setSaveStatus('idle');
      }
      
    } catch (error) {
      if (!mountedRef.current) return;
      
      // Log error with context for debugging
      console.error('Autosave hook: Save operation failed', {
        error,
        timestamp: new Date().toISOString(),
        component: 'useDebounceAutosave'
      });
      
      if (showFeedback) {
        setSaveStatus('error');
        
        // Clear any existing status timeout
        if (statusTimeoutRef.current) {
          clearTimeout(statusTimeoutRef.current);
        }
        
        // Clear error status after 3 seconds
        statusTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            setSaveStatus('idle');
          }
        }, 3000);
      } else {
        setSaveStatus('idle');
      }
    }
  }, [saveFunction, showFeedback]);

  /**
   * Trigger a debounced save operation
   * 
   * This function can be called multiple times rapidly, but the actual save
   * operation will only execute once after the specified delay period.
   */
  const triggerSave = useCallback(() => {
    // Mark that a save has been requested
    saveRequestRef.current = true;
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set up new debounced save
    timeoutRef.current = setTimeout(() => {
      if (saveRequestRef.current) {
        saveRequestRef.current = false;
        executeSave();
      }
    }, delay);
  }, [delay, executeSave]);

  /**
   * Clear the current save status
   */
  const clearStatus = useCallback(() => {
    if (mountedRef.current) {
      setSaveStatus('idle');
    }
  }, []);

  // Set mounted flag and cleanup timeouts on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
    };
  }, []);

  return {
    triggerSave,
    saveStatus,
    isSaving: saveStatus === 'saving',
    clearStatus,
  };
}

/**
 * Simple debounce hook for general use
 * 
 * @param callback - Function to debounce
 * @param delay - Debounce delay in milliseconds
 * @returns Debounced version of the callback
 */
export function useDebounce<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}