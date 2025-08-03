/**
 * React Hook for Audio Control
 * 
 * Provides React integration for the AudioManager with state management,
 * initialization handling, and convenient methods for timer audio events.
 * 
 * Features:
 * - Automatic initialization on first user interaction
 * - State synchronization with React components
 * - Convenient methods for timer events (round start/end, warnings)
 * - Volume and mute controls with persistence
 * - Loading states and error handling
 */

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { AudioManager, AudioType, getAudioManager } from '../lib/audio-manager';
import { getPublicPath } from '../lib/get-base-path';
import { createModuleLogger } from '../lib/logger';

// Initialize module logger
const log = createModuleLogger('useAudio');

// Hook state interface
interface UseAudioState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  volume: number;
  isMuted: boolean;
  hasWebAudioSupport: boolean;
}

// Hook return interface
export interface UseAudioReturn extends UseAudioState {
  // Initialization
  initialize: () => Promise<void>;
  
  // Playback methods
  play: (type: AudioType, when?: number) => Promise<void>;
  playBell: (when?: number) => Promise<void>;
  playBeep: (when?: number) => Promise<void>;
  playWarning: (when?: number) => Promise<void>;
  
  // Timer-specific methods
  playRoundStart: (when?: number) => Promise<void>;
  playRoundEnd: (when?: number) => Promise<void>;
  playWorkoutEnd: (when?: number) => Promise<void>;
  playTenSecondWarning: (when?: number) => Promise<void>;
  
  // Volume and mute controls
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  toggleMute: () => void;
  
  // Utility
  isReady: () => boolean;
}

// Storage key for persisting audio settings
const AUDIO_SETTINGS_KEY = 'boxing-timer-audio-settings';

// Persisted audio settings
interface AudioSettings {
  volume: number;
  isMuted: boolean;
}

/**
 * React hook for audio control in the Boxing Timer
 * 
 * Manages audio initialization, playback, and settings persistence.
 * Automatically handles browser autoplay policies and provides fallback support.
 * 
 * @returns Audio control interface with state and methods
 */
export function useAudio(): UseAudioReturn {
  const audioManagerRef = useRef<AudioManager | null>(null);
  const initializePromiseRef = useRef<Promise<void> | null>(null);
  
  const [state, setState] = useState<UseAudioState>({
    isInitialized: false,
    isLoading: false,
    error: null,
    volume: 100,
    isMuted: false,
    hasWebAudioSupport: false,
  });

  // Get audio manager instance
  const getManager = useCallback((): AudioManager => {
    if (!audioManagerRef.current) {
      audioManagerRef.current = getAudioManager({
        baseUrl: getPublicPath('/sounds')
      });
    }
    return audioManagerRef.current;
  }, []);

  // Load persisted audio settings
  const loadSettings = useCallback((): AudioSettings => {
    try {
      const stored = localStorage.getItem(AUDIO_SETTINGS_KEY);
      if (stored) {
        const settings = JSON.parse(stored) as AudioSettings;
        return {
          volume: Math.max(0, Math.min(100, settings.volume || 100)),
          isMuted: Boolean(settings.isMuted),
        };
      }
    } catch (error) {
      log.warn('Failed to load audio settings:', error);
    }
    
    return { volume: 100, isMuted: false };
  }, []);

  // Save audio settings to localStorage
  const saveSettings = useCallback((settings: Partial<AudioSettings>) => {
    try {
      const current = loadSettings();
      const updated = { ...current, ...settings };
      localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(updated));
    } catch (error) {
      log.warn('Failed to save audio settings:', error);
    }
  }, [loadSettings]);

  // Initialize audio system
  const initialize = useCallback(async (): Promise<void> => {
    // Return existing promise if initialization is in progress
    if (initializePromiseRef.current) {
      return initializePromiseRef.current;
    }

    // Skip if already initialized
    if (state.isInitialized) {
      return;
    }

    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null 
    }));

    const initPromise = (async () => {
      try {
        const manager = getManager();
        
        // Apply loaded settings to manager
        const settings = loadSettings();
        // Apply volume and mute settings to manager
        manager.setVolume(settings.volume);
        manager.setMuted(settings.isMuted);
        
        // Initialize the audio system
        await manager.initialize();
        
        // Update state with current manager state
        const updatedState = manager.getState();
        setState(prev => ({
          ...prev,
          isInitialized: updatedState.isInitialized,
          isLoading: false,
          error: null,
          volume: 100,
          isMuted: false,
          hasWebAudioSupport: updatedState.hasWebAudioSupport,
        }));
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Audio initialization failed';
        
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        
        // Don't throw - allow graceful fallback
        log.error('Audio initialization error:', error);
      }
    })();

    initializePromiseRef.current = initPromise;
    
    try {
      await initPromise;
    } finally {
      initializePromiseRef.current = null;
    }
  }, [state.isInitialized, getManager, loadSettings]);

  // Play audio of specified type
  const play = useCallback(async (type: AudioType, when: number = 0): Promise<void> => {
    try {
      const manager = getManager();
      if (!manager.isReady() && !state.isLoading && !state.error) {
        // Only auto-initialize if not already loading or failed
        await initialize();
      }
      
      // Only try to play if manager is ready
      if (manager.isReady()) {
        await manager.play(type, when);
      }
    } catch (error) {
      log.warn(`Failed to play ${type} audio:`, error);
      // Don't update state repeatedly to avoid infinite loops
    }
  }, [getManager, initialize, state.isLoading, state.error]);

  // Convenient play methods
  const playBell = useCallback((when?: number) => play('bell', when), [play]);
  const playBeep = useCallback((when?: number) => play('beep', when), [play]);
  const playWarning = useCallback((when?: number) => play('warning', when), [play]);

  // Timer-specific audio methods
  const playRoundStart = useCallback((when?: number) => playBell(when), [playBell]);
  const playRoundEnd = useCallback((when?: number) => playBell(when), [playBell]);
  const playWorkoutEnd = useCallback((when?: number) => {
    // Play double bell for workout end
    playBell(when);
    return playBell((when || 0) + 0.5);
  }, [playBell]);
  const playTenSecondWarning = useCallback((when?: number) => playWarning(when), [playWarning]);

  // Volume control
  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(100, volume));
    setState(prev => ({ ...prev, volume: clampedVolume }));
    saveSettings({ volume: clampedVolume });
    // Note: AudioManager doesn't support volume control yet
  }, [saveSettings]);

  // Mute control
  const setMuted = useCallback((muted: boolean) => {
    setState(prev => ({ ...prev, isMuted: muted }));
    saveSettings({ isMuted: muted });
    // Note: AudioManager doesn't support mute control yet
  }, [saveSettings]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setState(prev => {
      const newMuted = !prev.isMuted;
      saveSettings({ isMuted: newMuted });
      return { ...prev, isMuted: newMuted };
    });
    // Note: AudioManager doesn't support mute control yet
  }, [saveSettings]);

  // Check if audio is ready
  const isReady = useCallback((): boolean => {
    return getManager().isReady();
  }, [getManager]);

  // Initialize on mount and load settings
  useEffect(() => {
    const settings = loadSettings();
    const manager = getManager();
    const managerState = manager.getState();
    
    setState(prev => ({
      ...prev,
      volume: settings.volume,
      isMuted: settings.isMuted,
      hasWebAudioSupport: managerState.hasWebAudioSupport,
    }));
  }, [getManager, loadSettings]);

  // Clear error after some time
  useEffect(() => {
    if (state.error) {
      const timeout = setTimeout(() => {
        setState(prev => ({ ...prev, error: null }));
      }, 5000);
      
      return () => clearTimeout(timeout);
    }
  }, [state.error]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioManagerRef.current) {
        audioManagerRef.current.dispose();
        audioManagerRef.current = null;
      }
    };
  }, []);

  return useMemo(() => ({
    // State
    isInitialized: state.isInitialized,
    isLoading: state.isLoading,
    error: state.error,
    volume: state.volume,
    isMuted: state.isMuted,
    hasWebAudioSupport: state.hasWebAudioSupport,
    
    // Methods
    initialize,
    play,
    playBell,
    playBeep,
    playWarning,
    playRoundStart,
    playRoundEnd,
    playWorkoutEnd,
    playTenSecondWarning,
    setVolume,
    setMuted,
    toggleMute,
    isReady,
  }), [
    state.isInitialized,
    state.isLoading,
    state.error,
    state.volume,
    state.isMuted,
    state.hasWebAudioSupport,
    initialize,
    play,
    playBell,
    playBeep,
    playWarning,
    playRoundStart,
    playRoundEnd,
    playWorkoutEnd,
    playTenSecondWarning,
    setVolume,
    setMuted,
    toggleMute,
    isReady,
  ]);
}