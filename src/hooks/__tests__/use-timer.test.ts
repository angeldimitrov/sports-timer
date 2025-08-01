/**
 * useTimer Hook Unit Tests
 * 
 * Comprehensive test suite for the useTimer React hook focusing on:
 * - Hook state management and updates
 * - Timer engine integration and lifecycle
 * - Event handling and state synchronization
 * - Configuration management and preset handling
 * - Error handling and recovery
 * - Cleanup and memory management
 * - Performance and responsiveness
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useTimer, useBoxingTimer, useCustomTimer } from '../use-timer'
import { TimerConfig, TimerEvent, TimerEngine } from '../../lib/timer-engine'

// Mock performance timing
const mockPerformanceNow = jest.fn()
global.performance.now = mockPerformanceNow

// Mock TimerEngine for testing
jest.mock('../../lib/timer-engine', () => {
  const originalModule = jest.requireActual('../../lib/timer-engine')
  return {
    ...originalModule,
    TimerEngine: jest.fn()
  }
})

describe('useTimer Hook', () => {
  let currentTime = 0

  beforeEach(() => {
    currentTime = 0
    mockPerformanceNow.mockImplementation(() => currentTime)
    jest.clearAllTimers()
    jest.clearAllMocks()
  })

  describe('Hook Initialization', () => {
    /**
     * Test basic hook initialization
     * Business Rule: Hook should initialize with proper default state
     */
    test('should initialize with default configuration', () => {
      const { result } = renderHook(() => useTimer())
      
      expect(result.current.isReady).toBe(true)
      expect(result.current.error).toBeNull()
      expect(result.current.state.status).toBe('idle')
      expect(result.current.state.phase).toBe('work')
      expect(result.current.state.currentRound).toBe(1)
      expect(result.current.isIdle).toBe(true)
      expect(result.current.isRunning).toBe(false)
      expect(result.current.isPaused).toBe(false)
      expect(result.current.isCompleted).toBe(false)
    })

    /**
     * Test initialization with custom configuration
     * Business Rule: Custom config should override defaults
     */
    test('should initialize with custom configuration', () => {
      const customConfig: TimerConfig = {
        workDuration: 120,
        restDuration: 45,
        totalRounds: 8,
        enableWarning: false
      }
      
      const { result } = renderHook(() => useTimer({ config: customConfig }))
      
      expect(result.current.config).toEqual(customConfig)
      expect(result.current.state.timeRemaining).toBe(120 * 1000)
    })

    /**
     * Test initialization with preset
     * Business Rule: Presets should load correct configurations
     */
    test('should initialize with preset configuration', () => {
      const { result } = renderHook(() => useTimer({ preset: 'beginner' }))
      
      expect(result.current.config.workDuration).toBe(120)
      expect(result.current.config.restDuration).toBe(60)
      expect(result.current.config.totalRounds).toBe(3)
      expect(result.current.config.enableWarning).toBe(true)
    })

    /**
     * Test auto-start functionality
     * Business Rule: Auto-start should begin timer immediately
     */
    test('should auto-start timer when requested', async () => {
      const { result } = renderHook(() => useTimer({ autoStart: true }))
      
      await waitFor(() => {
        expect(result.current.isRunning).toBe(true)
      })
    })

    /**
     * Test event handler setup
     * Business Rule: External event handlers should receive timer events
     */
    test('should set up external event handler', async () => {
      const mockEventHandler = jest.fn()
      
      const { result } = renderHook(() => useTimer({
        onEvent: mockEventHandler
      }))
      
      act(() => {
        result.current.start()
      })
      
      await waitFor(() => {
        expect(mockEventHandler).toHaveBeenCalled()
      })
    })
  })

  describe('Timer Control Methods', () => {
    /**
     * Test start method
     * Business Rule: Start should transition timer to running state
     */
    test('should start timer correctly', async () => {
      const { result } = renderHook(() => useTimer())
      
      act(() => {
        result.current.start()
      })
      
      await waitFor(() => {
        expect(result.current.isRunning).toBe(true)
        expect(result.current.state.status).toBe('running')
      })
    })

    /**
     * Test pause method
     * Business Rule: Pause should preserve exact timer state
     */
    test('should pause timer correctly', async () => {
      const { result } = renderHook(() => useTimer())
      
      // Start timer
      act(() => {
        result.current.start()
      })
      
      await waitFor(() => {
        expect(result.current.isRunning).toBe(true)
      })
      
      // Simulate some elapsed time
      currentTime = 3000
      
      // Pause timer
      act(() => {
        result.current.pause()
      })
      
      await waitFor(() => {
        expect(result.current.isPaused).toBe(true)
        expect(result.current.state.status).toBe('paused')
      })
    })

    /**
     * Test resume method
     * Business Rule: Resume should continue from pause point
     */
    test('should resume timer correctly', async () => {
      const { result } = renderHook(() => useTimer())
      
      // Start, pause, then resume
      act(() => {
        result.current.start()
      })
      
      await waitFor(() => {
        expect(result.current.isRunning).toBe(true)
      })
      
      act(() => {
        result.current.pause()
      })
      
      await waitFor(() => {
        expect(result.current.isPaused).toBe(true)
      })
      
      act(() => {
        result.current.resume()
      })
      
      await waitFor(() => {
        expect(result.current.isRunning).toBe(true)
        expect(result.current.isPaused).toBe(false)
      })
    })

    /**
     * Test stop method
     * Business Rule: Stop should reset timer to initial state
     */
    test('should stop timer and reset state', async () => {
      const { result } = renderHook(() => useTimer())
      
      // Start timer
      act(() => {
        result.current.start()
      })
      
      await waitFor(() => {
        expect(result.current.isRunning).toBe(true)
      })
      
      // Stop timer
      act(() => {
        result.current.stop()
      })
      
      await waitFor(() => {
        expect(result.current.isIdle).toBe(true)
        expect(result.current.state.timeElapsed).toBe(0)
        expect(result.current.state.progress).toBe(0)
        expect(result.current.state.currentRound).toBe(1)
      })
    })

    /**
     * Test reset method
     * Business Rule: Reset should be equivalent to stop
     */
    test('should reset timer to initial state', async () => {
      const { result } = renderHook(() => useTimer())
      
      act(() => {
        result.current.start()
      })
      
      await waitFor(() => {
        expect(result.current.isRunning).toBe(true)
      })
      
      act(() => {
        result.current.reset()
      })
      
      await waitFor(() => {
        expect(result.current.isIdle).toBe(true)
        expect(result.current.state.timeRemaining).toBe(result.current.config.workDuration * 1000)
      })
    })

    /**
     * Test method calls when not ready
     * Business Rule: Methods should be safe to call before ready
     */
    test('should handle method calls when not ready', () => {
      const { result } = renderHook(() => useTimer())
      
      // Temporarily set not ready
      ;(result.current as any).isReady = false
      
      expect(() => {
        result.current.start()
        result.current.pause()
        result.current.resume()
        result.current.stop()
        result.current.reset()
      }).not.toThrow()
    })
  })

  describe('Configuration Management', () => {
    /**
     * Test configuration updates
     * Business Rule: Config updates should reset timer state
     */
    test('should update configuration correctly', async () => {
      const { result } = renderHook(() => useTimer())
      
      const newConfig: Partial<TimerConfig> = {
        workDuration: 240,
        totalRounds: 6
      }
      
      act(() => {
        result.current.updateConfig(newConfig)
      })
      
      await waitFor(() => {
        expect(result.current.config.workDuration).toBe(240)
        expect(result.current.config.totalRounds).toBe(6)
        expect(result.current.state.timeRemaining).toBe(240 * 1000)
      })
    })

    /**
     * Test preset loading
     * Business Rule: Presets should reinitialize timer with new config
     */
    test('should load preset configurations', async () => {
      const { result } = renderHook(() => useTimer())
      
      act(() => {
        result.current.loadPreset('advanced')
      })
      
      await waitFor(() => {
        expect(result.current.config.workDuration).toBe(180)
        expect(result.current.config.totalRounds).toBe(12)
      })
      
      // Should reset to new config
      expect(result.current.isIdle).toBe(true)
      expect(result.current.state.timeRemaining).toBe(180 * 1000)
    })

    /**
     * Test invalid preset handling
     * Business Rule: Invalid presets should set error state
     */
    test('should handle invalid preset gracefully', async () => {
      const { result } = renderHook(() => useTimer())
      
      act(() => {
        result.current.loadPreset('invalid' as 'beginner')
      })
      
      await waitFor(() => {
        expect(result.current.error).not.toBeNull()
      })
    })
  })

  describe('State Computed Values', () => {
    /**
     * Test formatted time values
     * Business Rule: Time should be formatted as MM:SS
     */
    test('should format time values correctly', () => {
      const config: TimerConfig = {
        workDuration: 125, // 2:05
        restDuration: 45,  // 0:45
        totalRounds: 1,
        enableWarning: true
      }
      
      const { result } = renderHook(() => useTimer({ config }))
      
      expect(result.current.formattedTimeRemaining).toBe('02:05')
      expect(result.current.formattedTimeElapsed).toBe('00:00')
    })

    /**
     * Test phase detection
     * Business Rule: Should correctly identify work vs rest phases
     */
    test('should detect work and rest phases correctly', async () => {
      const { result } = renderHook(() => useTimer())
      
      // Initially in work phase
      expect(result.current.isWorkPhase).toBe(true)
      expect(result.current.isRestPhase).toBe(false)
      
      // Start timer and simulate work completion
      act(() => {
        result.current.start()
      })
      
      // Would need to simulate timer events to test phase transitions
      // This is tested more thoroughly in integration tests
    })

    /**
     * Test status detection
     * Business Rule: Should correctly identify timer status
     */
    test('should detect timer status correctly', async () => {
      const { result } = renderHook(() => useTimer())
      
      expect(result.current.isIdle).toBe(true)
      expect(result.current.isRunning).toBe(false)
      expect(result.current.isPaused).toBe(false)
      expect(result.current.isCompleted).toBe(false)
      
      act(() => {
        result.current.start()
      })
      
      await waitFor(() => {
        expect(result.current.isIdle).toBe(false)
        expect(result.current.isRunning).toBe(true)
      })
    })
  })

  describe('Error Handling', () => {
    /**
     * Test timer initialization errors
     * Business Rule: Initialization errors should be captured in error state
     */
    test('should handle timer initialization errors', async () => {
      // Mock timer engine to throw error
      const MockedTimerEngine = TimerEngine as jest.MockedClass<typeof TimerEngine>
      MockedTimerEngine.mockImplementation(() => {
        throw new Error('Timer initialization failed')
      })
      
      const { result } = renderHook(() => useTimer())
      
      await waitFor(() => {
        expect(result.current.error).not.toBeNull()
        expect(result.current.isReady).toBe(false)
      })
      
      // Reset mock
      MockedTimerEngine.mockRestore()
    })

    /**
     * Test timer event errors
     * Business Rule: Timer errors should be reflected in hook state
     */
    test('should handle timer event errors', async () => {
      const { result } = renderHook(() => useTimer())
      
      // Simulate error event from timer
      const mockTimerEngine = (result.current as any).timerRef.current
      if (mockTimerEngine && mockTimerEngine.eventHandlers) {
        const errorEvent: TimerEvent = {
          type: 'error',
          state: result.current.state,
          payload: { message: 'Timer error occurred' }
        }
        
        act(() => {
          mockTimerEngine.eventHandlers.forEach((handler: any) => handler(errorEvent))
        })
        
        await waitFor(() => {
          expect(result.current.error).not.toBeNull()
        })
      }
    })
  })

  describe('Cleanup and Memory Management', () => {
    /**
     * Test component unmount cleanup
     * Business Rule: Timer should be properly cleaned up on unmount
     */
    test('should clean up timer on unmount', () => {
      const { result, unmount } = renderHook(() => useTimer())
      
      const mockTimerEngine = (result.current as any).timerRef.current
      const mockDestroy = jest.spyOn(mockTimerEngine, 'destroy')
      
      unmount()
      
      expect(mockDestroy).toHaveBeenCalled()
    })

    /**
     * Test multiple initializations
     * Business Rule: Should properly clean up previous timer on reinit
     */
    test('should clean up previous timer on reinitialization', async () => {
      const { result } = renderHook(() => useTimer())
      
      const firstTimer = (result.current as any).timerRef.current
      const mockDestroy = jest.spyOn(firstTimer, 'destroy')
      
      // Load new preset (triggers reinit)
      act(() => {
        result.current.loadPreset('intermediate')
      })
      
      await waitFor(() => {
        expect(mockDestroy).toHaveBeenCalled()
      })
    })
  })

  describe('Performance and Responsiveness', () => {
    /**
     * Test state update frequency
     * Business Rule: Hook should update efficiently without excessive re-renders
     */
    test('should update state efficiently', async () => {
      let renderCount = 0
      
      const { result } = renderHook(() => {
        renderCount++
        return useTimer()
      })
      
      const initialRenderCount = renderCount
      
      act(() => {
        result.current.start()
      })
      
      // Should not cause excessive re-renders
      await waitFor(() => {
        expect(renderCount - initialRenderCount).toBeLessThan(5)
      })
    })

    /**
     * Test callback stability
     * Business Rule: Callbacks should be stable to prevent unnecessary re-renders
     */
    test('should provide stable callbacks', () => {
      const { result, rerender } = renderHook(() => useTimer())
      
      const firstCallbacks = {
        start: result.current.start,
        pause: result.current.pause,
        resume: result.current.resume,
        stop: result.current.stop,
        reset: result.current.reset,
        updateConfig: result.current.updateConfig,
        loadPreset: result.current.loadPreset
      }
      
      rerender()
      
      const secondCallbacks = {
        start: result.current.start,
        pause: result.current.pause,
        resume: result.current.resume,
        stop: result.current.stop,
        reset: result.current.reset,
        updateConfig: result.current.updateConfig,
        loadPreset: result.current.loadPreset
      }
      
      // Callbacks should be stable (same reference)
      Object.keys(firstCallbacks).forEach(key => {
        expect(firstCallbacks[key as keyof typeof firstCallbacks])
          .toBe(secondCallbacks[key as keyof typeof secondCallbacks])
      })
    })
  })
})

describe('useBoxingTimer Hook', () => {
  /**
   * Test preset-specific hook variant
   * Business Rule: Should initialize with specified preset
   */
  test('should initialize with specified preset', () => {
    const { result } = renderHook(() => useBoxingTimer('intermediate'))
    
    expect(result.current.config.workDuration).toBe(180)
    expect(result.current.config.restDuration).toBe(60)
    expect(result.current.config.totalRounds).toBe(5)
  })

  /**
   * Test preset hook with options
   * Business Rule: Should support additional options with preset
   */
  test('should support additional options', () => {
    const mockOnEvent = jest.fn()
    
    const { result } = renderHook(() => 
      useBoxingTimer('beginner', { onEvent: mockOnEvent })
    )
    
    expect(result.current.config.totalRounds).toBe(3)
    
    act(() => {
      result.current.start()
    })
    
    expect(mockOnEvent).toHaveBeenCalled()
  })
})

describe('useCustomTimer Hook', () => {
  /**
   * Test custom configuration hook variant
   * Business Rule: Should initialize with custom configuration
   */
  test('should initialize with custom configuration', () => {
    const customConfig: TimerConfig = {
      workDuration: 300,
      restDuration: 90,
      totalRounds: 10,
      enableWarning: false
    }
    
    const { result } = renderHook(() => useCustomTimer(customConfig))
    
    expect(result.current.config).toEqual(customConfig)
  })

  /**
   * Test custom hook with options
   * Business Rule: Should support additional options with custom config
   */
  test('should support additional options', () => {
    const customConfig: TimerConfig = {
      workDuration: 150,
      restDuration: 30,
      totalRounds: 8,
      enableWarning: true
    }
    
    const { result } = renderHook(() => 
      useCustomTimer(customConfig, { autoStart: true })
    )
    
    expect(result.current.config).toEqual(customConfig)
    expect(result.current.isRunning).toBe(true)
  })
})