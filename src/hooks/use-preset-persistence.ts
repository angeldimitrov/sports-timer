/**
 * Hook for persisting and managing timer preset selection
 * 
 * Provides functionality to:
 * - Store the user's last selected preset in localStorage
 * - Default to 'beginner' preset on first use
 * - Restore the last selected preset on app reload
 */

import { useState, useEffect, useCallback } from 'react';

type PresetType = 'beginner' | 'intermediate' | 'advanced' | 'custom';

const PRESET_STORAGE_KEY = 'boxing-timer-selected-preset';
const DEFAULT_PRESET: PresetType = 'beginner';

export interface UsePresetPersistenceReturn {
  /** Currently selected preset (null during initialization) */
  selectedPreset: PresetType | null;
  /** Update the selected preset and persist to storage */
  setSelectedPreset: (preset: PresetType) => void;
  /** Check if a preset is currently selected */
  isPresetSelected: (preset: PresetType) => boolean;
  /** Get the initial preset (for useTimer hook) */
  getInitialPreset: () => PresetType;
  /** Whether the hook has finished loading from localStorage */
  isInitialized: boolean;
}

/**
 * Hook for managing preset selection persistence
 * 
 * Automatically defaults to beginner preset and remembers user selection
 * across browser sessions using localStorage.
 */
export function usePresetPersistence(): UsePresetPersistenceReturn {
  const [selectedPreset, setSelectedPresetState] = useState<PresetType | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load saved preset from localStorage on mount
  useEffect(() => {
    try {
      const savedPreset = localStorage.getItem(PRESET_STORAGE_KEY);
      if (savedPreset && ['beginner', 'intermediate', 'advanced', 'custom'].includes(savedPreset)) {
        setSelectedPresetState(savedPreset as PresetType);
      } else {
        setSelectedPresetState(DEFAULT_PRESET);
      }
    } catch {
      // If localStorage fails, stick with default
      setSelectedPresetState(DEFAULT_PRESET);
    }
    setIsInitialized(true);
  }, []);

  // Save preset to localStorage when it changes
  const setSelectedPreset = useCallback((preset: PresetType) => {
    setSelectedPresetState(preset);
    try {
      localStorage.setItem(PRESET_STORAGE_KEY, preset);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Check if a preset is currently selected
  const isPresetSelected = useCallback((preset: PresetType) => {
    return selectedPreset === preset;
  }, [selectedPreset]);

  // Get initial preset for useTimer hook
  const getInitialPreset = useCallback(() => {
    return selectedPreset || DEFAULT_PRESET;
  }, [selectedPreset]);

  return {
    selectedPreset,
    setSelectedPreset,
    isPresetSelected,
    getInitialPreset,
    isInitialized,
  };
}