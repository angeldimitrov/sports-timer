/**
 * useAudio Hook Unit Tests
 * 
 * Comprehensive test suite for the useAudio React hook focusing on:
 * - Hook state management and initialization
 * - Audio manager integration and lifecycle
 * - Settings persistence and restoration
 * - Playback methods and error handling
 * - Volume and mute control
 * - Timer-specific audio functionality
 * - Performance and memory management
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useAudio } from '../use-audio'
import { resetAudioManager } from '../../lib/audio-manager'

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}

// Mock audio manager
const mockAudioManager = {
  initialize: jest.fn(() => Promise.resolve()),
  play: jest.fn(() => Promise.resolve()),
  setVolume: jest.fn(),
  setMuted: jest.fn(),
  getState: jest.fn(() => ({
    isInitialized: false,
    hasWebAudioSupport: true,
    usingSyntheticAudio: false
  })),
  isReady: jest.fn(() => true),
  dispose: jest.fn()
}

// Mock getAudioManager
jest.mock('../../lib/audio-manager', () => ({
  getAudioManager: jest.fn(() => mockAudioManager),
  resetAudioManager: jest.fn()
}))

describe('useAudio Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.localStorage = mockLocalStorage as any
    
    // Reset mock implementations
    mockAudioManager.initialize.mockResolvedValue(undefined)
    mockAudioManager.play.mockResolvedValue(undefined)
    mockAudioManager.getState.mockReturnValue({
      isInitialized: false,
      hasWebAudioSupport: true,
      usingSyntheticAudio: false
    })
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    resetAudioManager()
  })

  describe('Hook Initialization', () => {
    /**
     * Test basic hook initialization
     * Business Rule: Hook should initialize with default state and load persisted settings
     */
    test('should initialize with default state', () => {
      const { result } = renderHook(() => useAudio())
      
      expect(result.current.isInitialized).toBe(false)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.volume).toBe(80)
      expect(result.current.isMuted).toBe(false)
      expect(result.current.hasWebAudioSupport).toBe(true)
    })

    /**
     * Test settings loading from localStorage
     * Business Rule: Should restore previously saved audio settings
     */
    test('should load saved settings from localStorage', () => {
      const savedSettings = {
        volume: 65,
        isMuted: true
      }
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedSettings))
      
      const { result } = renderHook(() => useAudio())
      
      expect(result.current.volume).toBe(65)
      expect(result.current.isMuted).toBe(true)
      expect(mockAudioManager.setVolume).toHaveBeenCalledWith(65)
      expect(mockAudioManager.setMuted).toHaveBeenCalledWith(true)
    })

    /**
     * Test invalid localStorage data handling
     * Business Rule: Should handle corrupted localStorage gracefully
     */
    test('should handle invalid localStorage data gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json')
      
      const { result } = renderHook(() => useAudio())
      
      // Should fall back to defaults
      expect(result.current.volume).toBe(80)
      expect(result.current.isMuted).toBe(false)
    })

    /**
     * Test audio manager state synchronization
     * Business Rule: Hook state should sync with audio manager state
     */
    test('should synchronize with audio manager state', () => {
      mockAudioManager.getState.mockReturnValue({
        isInitialized: true,
        hasWebAudioSupport: false,
        usingSyntheticAudio: true
      })
      
      const { result } = renderHook(() => useAudio())
      
      expect(result.current.hasWebAudioSupport).toBe(false)
    })
  })

  describe('Audio Initialization', () => {
    /**
     * Test manual initialization
     * Business Rule: Should initialize audio manager and update state
     */
    test('should initialize audio manager successfully', async () => {
      mockAudioManager.getState
        .mockReturnValueOnce({ isInitialized: false, hasWebAudioSupport: true, usingSyntheticAudio: false })
        .mockReturnValueOnce({ isInitialized: true, hasWebAudioSupport: true, usingSyntheticAudio: false })
      
      const { result } = renderHook(() => useAudio())
      
      expect(result.current.isInitialized).toBe(false)
      
      await act(async () => {
        await result.current.initialize()
      })
      
      expect(mockAudioManager.initialize).toHaveBeenCalled()
      expect(result.current.isInitialized).toBe(true)
    })

    /**
     * Test initialization loading state
     * Business Rule: Should show loading state during initialization
     */
    test('should show loading state during initialization', async () => {
      let resolveInit: () => void
      const initPromise = new Promise<void>((resolve) => {
        resolveInit = resolve
      })
      
      mockAudioManager.initialize.mockReturnValue(initPromise)
      
      const { result } = renderHook(() => useAudio())
      
      act(() => {
        result.current.initialize()
      })
      
      expect(result.current.isLoading).toBe(true)
      
      await act(async () => {
        resolveInit!()
        await initPromise
      })
      
      expect(result.current.isLoading).toBe(false)
    })

    /**
     * Test initialization error handling
     * Business Rule: Should handle initialization errors gracefully
     */
    test('should handle initialization errors gracefully', async () => {
      const initError = new Error('Audio initialization failed')
      mockAudioManager.initialize.mockRejectedValue(initError)
      
      const { result } = renderHook(() => useAudio())
      
      await act(async () => {
        await result.current.initialize()
      })
      
      expect(result.current.error).toBe('Audio initialization failed')
      expect(result.current.isLoading).toBe(false)
    })

    /**
     * Test duplicate initialization handling
     * Business Rule: Should not initialize multiple times simultaneously
     */
    test('should handle duplicate initialization calls', async () => {
      mockAudioManager.getState.mockReturnValue({
        isInitialized: false,
        hasWebAudioSupport: true,
        usingSyntheticAudio: false
      })
      
      const { result } = renderHook(() => useAudio())
      
      // Start multiple initializations
      const promises = [
        result.current.initialize(),
        result.current.initialize(),
        result.current.initialize()
      ]
      
      await act(async () => {
        await Promise.all(promises)
      })
      
      // Should only call initialize once
      expect(mockAudioManager.initialize).toHaveBeenCalledTimes(1)
    })
  })

  describe('Audio Playback', () => {
    beforeEach(async () => {
      mockAudioManager.getState.mockReturnValue({
        isInitialized: true,
        hasWebAudioSupport: true,
        usingSyntheticAudio: false
      })
    })

    /**
     * Test basic audio playback
     * Business Rule: Should play audio through audio manager
     */
    test('should play audio correctly', async () => {
      const { result } = renderHook(() => useAudio())
      
      await act(async () => {
        await result.current.play('bell', 0.5)
      })
      
      expect(mockAudioManager.play).toHaveBeenCalledWith('bell', 0.5)
    })

    /**
     * Test auto-initialization on first play
     * Business Rule: Should auto-initialize when first play is attempted
     */
    test('should auto-initialize on first play', async () => {
      mockAudioManager.isReady.mockReturnValue(false)
      mockAudioManager.getState
        .mockReturnValueOnce({ isInitialized: false, hasWebAudioSupport: true, usingSyntheticAudio: false })
        .mockReturnValueOnce({ isInitialized: true, hasWebAudioSupport: true, usingSyntheticAudio: false })
      
      const { result } = renderHook(() => useAudio())
      
      await act(async () => {
        await result.current.play('beep')
      })
      
      expect(mockAudioManager.initialize).toHaveBeenCalled()
      expect(mockAudioManager.play).toHaveBeenCalledWith('beep', 0)
    })

    /**
     * Test playback error handling
     * Business Rule: Should handle playback errors and update error state
     */
    test('should handle playback errors', async () => {
      const playError = new Error('Playback failed')
      mockAudioManager.play.mockRejectedValue(playError)
      
      const { result } = renderHook(() => useAudio())
      
      await act(async () => {
        await result.current.play('warning')
      })
      
      expect(result.current.error).toBe('Playback failed')
    })

    /**
     * Test convenient playback methods
     * Business Rule: Should provide convenient methods for each audio type
     */
    test('should provide convenient playback methods', async () => {
      const { result } = renderHook(() => useAudio())
      
      await act(async () => {
        await result.current.playBell(0.5)
      })
      expect(mockAudioManager.play).toHaveBeenCalledWith('bell', 0.5)
      
      await act(async () => {
        await result.current.playBeep()
      })
      expect(mockAudioManager.play).toHaveBeenCalledWith('beep', 0)
      
      await act(async () => {
        await result.current.playWarning(1.0)
      })
      expect(mockAudioManager.play).toHaveBeenCalledWith('warning', 1.0)
    })
  })

  describe('Timer-Specific Audio Methods', () => {
    /**
     * Test timer-specific audio methods
     * Business Rule: Should provide methods for specific timer events
     */
    test('should provide timer-specific audio methods', async () => {
      const { result } = renderHook(() => useAudio())
      
      // Round start should play bell
      await act(async () => {
        await result.current.playRoundStart()
      })
      expect(mockAudioManager.play).toHaveBeenCalledWith('bell', 0)
      
      // Round end should play bell
      await act(async () => {
        await result.current.playRoundEnd()
      })
      expect(mockAudioManager.play).toHaveBeenCalledWith('bell', 0)
      
      // Ten second warning should play warning
      await act(async () => {
        await result.current.playTenSecondWarning()
      })
      expect(mockAudioManager.play).toHaveBeenCalledWith('warning', 0)
    })

    /**
     * Test workout end double bell
     * Business Rule: Workout end should play double bell sequence
     */
    test('should play double bell for workout end', async () => {
      const { result } = renderHook(() => useAudio())
      
      await act(async () => {
        await result.current.playWorkoutEnd()
      })
      
      // Should play two bells with delay
      expect(mockAudioManager.play).toHaveBeenCalledWith('bell', 0)
      expect(mockAudioManager.play).toHaveBeenCalledWith('bell', 0.5)
    })

    /**
     * Test scheduled timer audio
     * Business Rule: Should support scheduled playback for timer events
     */
    test('should support scheduled timer audio', async () => {
      const { result } = renderHook(() => useAudio())
      
      await act(async () => {
        await result.current.playRoundStart(2.0)
      })
      
      expect(mockAudioManager.play).toHaveBeenCalledWith('bell', 2.0)
    })
  })

  describe('Volume and Mute Control', () => {
    /**
     * Test volume control
     * Business Rule: Should control volume and persist settings
     */
    test('should control volume correctly', () => {
      const { result } = renderHook(() => useAudio())
      
      act(() => {
        result.current.setVolume(45)
      })
      
      expect(result.current.volume).toBe(45)
      expect(mockAudioManager.setVolume).toHaveBeenCalledWith(45)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'boxing-timer-audio-settings',
        JSON.stringify({ volume: 45, isMuted: false })
      )
    })

    /**
     * Test volume boundary handling
     * Business Rule: Should clamp volume to 0-100 range
     */
    test('should clamp volume to valid range', () => {
      const { result } = renderHook(() => useAudio())
      
      act(() => {
        result.current.setVolume(-10)
      })
      expect(result.current.volume).toBe(0)
      
      act(() => {
        result.current.setVolume(150)
      })
      expect(result.current.volume).toBe(100)
    })

    /**
     * Test mute control
     * Business Rule: Should control mute state and persist settings
     */
    test('should control mute correctly', () => {
      const { result } = renderHook(() => useAudio())
      
      act(() => {
        result.current.setMuted(true)
      })
      
      expect(result.current.isMuted).toBe(true)
      expect(mockAudioManager.setMuted).toHaveBeenCalledWith(true)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'boxing-timer-audio-settings',
        JSON.stringify({ volume: 80, isMuted: true })
      )
    })

    /**
     * Test mute toggle
     * Business Rule: Should toggle mute state
     */
    test('should toggle mute state', () => {
      const { result } = renderHook(() => useAudio())
      
      expect(result.current.isMuted).toBe(false)
      
      act(() => {
        result.current.toggleMute()
      })
      
      expect(result.current.isMuted).toBe(true)
      
      act(() => {
        result.current.toggleMute()
      })
      
      expect(result.current.isMuted).toBe(false)
    })

    /**
     * Test settings persistence error handling
     * Business Rule: Should handle localStorage errors gracefully
     */
    test('should handle settings persistence errors', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage error')
      })
      
      const { result } = renderHook(() => useAudio())
      
      expect(() => {
        act(() => {
          result.current.setVolume(50)
        })
      }).not.toThrow()
      
      expect(result.current.volume).toBe(50)
    })
  })

  describe('Error Handling and Recovery', () => {
    /**
     * Test error state auto-clearing
     * Business Rule: Errors should auto-clear after timeout
     */
    test('should auto-clear errors after timeout', async () => {
      jest.useFakeTimers()
      
      const { result } = renderHook(() => useAudio())
      
      // Set error state
      mockAudioManager.play.mockRejectedValue(new Error('Test error'))
      
      await act(async () => {
        await result.current.play('bell')
      })
      
      expect(result.current.error).toBe('Test error')
      
      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(5000)
      })
      
      await waitFor(() => {
        expect(result.current.error).toBeNull()
      })
      
      jest.useRealTimers()
    })

    /**
     * Test ready state checking
     * Business Rule: Should accurately report audio system readiness
     */
    test('should check ready state correctly', () => {
      mockAudioManager.isReady.mockReturnValue(true)
      
      const { result } = renderHook(() => useAudio())
      
      expect(result.current.isReady()).toBe(true)
      
      mockAudioManager.isReady.mockReturnValue(false)
      expect(result.current.isReady()).toBe(false)
    })
  })

  describe('Cleanup and Memory Management', () => {
    /**
     * Test component unmount cleanup
     * Business Rule: Should dispose audio manager on unmount
     */
    test('should clean up audio manager on unmount', () => {
      const { unmount } = renderHook(() => useAudio())
      
      unmount()
      
      expect(mockAudioManager.dispose).toHaveBeenCalled()
    })

    /**
     * Test multiple unmounts
     * Business Rule: Should handle multiple unmounts safely
     */
    test('should handle multiple unmounts safely', () => {
      const { unmount } = renderHook(() => useAudio())
      
      expect(() => {
        unmount()
        unmount() // This shouldn't cause issues
      }).not.toThrow()
    })
  })

  describe('Performance and State Management', () => {
    /**
     * Test state update efficiency
     * Business Rule: Should update state efficiently without excessive re-renders
     */
    test('should update state efficiently', () => {
      let renderCount = 0
      
      const { result } = renderHook(() => {
        renderCount++
        return useAudio()
      })
      
      const initialRenderCount = renderCount
      
      act(() => {
        result.current.setVolume(50)
      })
      
      act(() => {
        result.current.setMuted(true)
      })
      
      // Should not cause excessive re-renders
      expect(renderCount - initialRenderCount).toBeLessThan(5)
    })

    /**
     * Test callback stability
     * Business Rule: Callbacks should be stable to prevent unnecessary re-renders
     */
    test('should provide stable callbacks', () => {
      const { result, rerender } = renderHook(() => useAudio())
      
      const firstCallbacks = {
        initialize: result.current.initialize,
        play: result.current.play,
        playBell: result.current.playBell,
        playBeep: result.current.playBeep,
        playWarning: result.current.playWarning,
        setVolume: result.current.setVolume,
        setMuted: result.current.setMuted,
        toggleMute: result.current.toggleMute
      }
      
      rerender()
      
      const secondCallbacks = {
        initialize: result.current.initialize,
        play: result.current.play,
        playBell: result.current.playBell,
        playBeep: result.current.playBeep,
        playWarning: result.current.playWarning,
        setVolume: result.current.setVolume,
        setMuted: result.current.setMuted,
        toggleMute: result.current.toggleMute
      }
      
      // Callbacks should be stable (same reference)
      Object.keys(firstCallbacks).forEach(key => {
        expect(firstCallbacks[key as keyof typeof firstCallbacks])
          .toBe(secondCallbacks[key as keyof typeof secondCallbacks])
      })
    })

    /**
     * Test concurrent operations
     * Business Rule: Should handle concurrent audio operations correctly
     */
    test('should handle concurrent operations', async () => {
      const { result } = renderHook(() => useAudio())
      
      // Start multiple operations simultaneously
      const operations = [
        result.current.play('bell'),
        result.current.play('beep'),
        result.current.initialize()
      ]
      
      await act(async () => {
        await Promise.allSettled(operations)
      })
      
      // Should handle all operations without errors
      expect(mockAudioManager.play).toHaveBeenCalledTimes(2)
      expect(mockAudioManager.initialize).toHaveBeenCalled()
    })
  })
})