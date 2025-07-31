/**
 * Workout Flow Integration Tests
 * 
 * Comprehensive integration test suite covering complete boxing workout scenarios:
 * - Full workout completion with timer + audio coordination
 * - Preset workout flows (beginner, intermediate, advanced)
 * - Pause/resume functionality during workouts
 * - Settings changes mid-workout
 * - Error recovery and resilience
 * - Multi-round workout progression
 * - Audio synchronization with timer events
 * - State persistence across interruptions
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useTimer } from '../../src/hooks/use-timer'
import { useAudio } from '../../src/hooks/use-audio'
import { TimerConfig, TimerEvent, TimerState } from '../../src/lib/timer-engine'
import { resetAudioManager } from '../../src/lib/audio-manager'

// Mock performance timing for controlled testing
const mockPerformanceNow = jest.fn()
global.performance.now = mockPerformanceNow

// Mock localStorage for settings persistence
const mockLocalStorage = {
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}
global.localStorage = mockLocalStorage as any

describe('Complete Workout Flow Integration Tests', () => {
  let currentTime = 0
  let timerEvents: TimerEvent[] = []
  let audioPlaybackLog: Array<{ type: string; when: number; timestamp: number }> = []

  // Mock audio manager for integration testing
  const mockAudioManager = {
    initialize: jest.fn(() => Promise.resolve()),
    play: jest.fn((type: string, when: number = 0) => {
      audioPlaybackLog.push({ type, when, timestamp: currentTime })
      return Promise.resolve()
    }),
    setVolume: jest.fn(),
    setMuted: jest.fn(),
    getState: jest.fn(() => ({
      isInitialized: true,
      hasWebAudioSupport: true,
      usingSyntheticAudio: false
    })),
    isReady: jest.fn(() => true),
    dispose: jest.fn()
  }

  // Mock getAudioManager
  jest.mock('../../src/lib/audio-manager', () => ({
    getAudioManager: jest.fn(() => mockAudioManager),
    resetAudioManager: jest.fn()
  }))

  beforeEach(() => {
    currentTime = 0
    timerEvents = []
    audioPlaybackLog = []
    
    mockPerformanceNow.mockImplementation(() => currentTime)
    jest.clearAllMocks()
    resetAudioManager()
  })

  afterEach(() => {
    jest.clearAllTimers()
  })

  describe('Complete Boxing Workout Flows', () => {
    /**
     * Test complete beginner workout flow
     * Business Rule: Beginner workout should complete 3 rounds (2min work, 1min rest) with audio cues
     */
    test('should complete full beginner workout with audio synchronization', async () => {
      const workoutConfig: TimerConfig = {
        workDuration: 120, // 2 minutes
        restDuration: 60,  // 1 minute
        totalRounds: 3,
        enableWarning: true
      }

      const { result: timerResult } = renderHook(() => 
        useTimer({ 
          config: workoutConfig,
          onEvent: (event) => timerEvents.push(event)
        })
      )

      const { result: audioResult } = renderHook(() => useAudio())

      // Wait for initialization
      await waitFor(() => {
        expect(timerResult.current.isReady).toBe(true)
      })

      // Initialize audio
      await act(async () => {
        await audioResult.current.initialize()
      })

      // Start workout
      act(() => {
        timerResult.current.start()
      })

      currentTime = 1000 // 1 second in

      // Simulate complete workout progression
      const roundProgression = [
        // Round 1
        { phase: 'work', duration: 120, round: 1 },
        { phase: 'rest', duration: 60, round: 1 },
        // Round 2
        { phase: 'work', duration: 120, round: 2 },
        { phase: 'rest', duration: 60, round: 2 },
        // Round 3
        { phase: 'work', duration: 120, round: 3 },
        { phase: 'rest', duration: 60, round: 3 }
      ]

      for (const segment of roundProgression) {
        // Simulate phase progression
        await act(async () => {
          currentTime += segment.duration * 1000 + 100 // Add small buffer
          const worker = (timerResult.current as any).timerRef.current?.worker
          if (worker && worker.forceTick) {
            worker.forceTick()
          }
        })

        await waitFor(() => {
          const state = timerResult.current.state
          if (segment.phase === 'work' && state.phase === 'rest') {
            // Work phase completed, now in rest
            expect(state.currentRound).toBe(segment.round)
          } else if (segment.phase === 'rest' && segment.round < 3) {
            // Rest phase completed, should advance to next round
            expect(state.currentRound).toBe(segment.round + 1)
            expect(state.phase).toBe('work')
          }
        })

        // Verify audio was played for phase transitions
        if (segment.phase === 'work') {
          // Should play bell at work start (except first which is at timer start)
          const workStartBells = audioPlaybackLog.filter(log => 
            log.type === 'bell' && log.timestamp > (segment.round - 1) * (120 + 60) * 1000
          )
          expect(workStartBells.length).toBeGreaterThan(0)
        }
      }

      // Workout should be completed
      await waitFor(() => {
        expect(timerResult.current.isCompleted).toBe(true)
        expect(timerResult.current.state.workoutProgress).toBe(1)
      })

      // Verify workout completion events
      const completionEvents = timerEvents.filter(e => e.type === 'workoutComplete')
      expect(completionEvents).toHaveLength(1)
      expect(completionEvents[0].payload.totalRounds).toBe(3)

      // Verify audio events occurred throughout workout
      expect(audioPlaybackLog.length).toBeGreaterThan(0)
      
      // Should have bells for round starts/ends and warnings
      const bells = audioPlaybackLog.filter(log => log.type === 'bell')
      const warnings = audioPlaybackLog.filter(log => log.type === 'warning')
      
      expect(bells.length).toBeGreaterThan(3) // At least one per round
      expect(warnings.length).toBeGreaterThan(0) // 10-second warnings
    })

    /**
     * Test intermediate workout flow with pause/resume
     * Business Rule: Should handle pause/resume correctly during workout
     */
    test('should handle pause and resume during intermediate workout', async () => {
      const workoutConfig: TimerConfig = {
        workDuration: 180, // 3 minutes
        restDuration: 60,  // 1 minute
        totalRounds: 5,
        enableWarning: true
      }

      const { result: timerResult } = renderHook(() => 
        useTimer({ 
          config: workoutConfig,
          onEvent: (event) => timerEvents.push(event)
        })
      )

      const { result: audioResult } = renderHook(() => useAudio())

      await waitFor(() => {
        expect(timerResult.current.isReady).toBe(true)
      })

      await act(async () => {
        await audioResult.current.initialize()
      })

      // Start workout
      act(() => {
        timerResult.current.start()
      })

      currentTime = 1000

      // Progress through first work phase partially
      act(() => {
        currentTime += 90 * 1000 // 1.5 minutes into first work
        const worker = (timerResult.current as any).timerRef.current?.worker
        if (worker && worker.forceTick) {
          worker.forceTick()
        }
      })

      // Pause workout
      act(() => {
        timerResult.current.pause()
      })

      await waitFor(() => {
        expect(timerResult.current.isPaused).toBe(true)
      })

      const pausedTimeRemaining = timerResult.current.state.timeRemaining
      const pausedTimeElapsed = timerResult.current.state.timeElapsed

      // Simulate time passing while paused (should not affect timer)
      currentTime += 30 * 1000 // 30 seconds pass

      // Resume workout
      act(() => {
        timerResult.current.resume()
      })

      await waitFor(() => {
        expect(timerResult.current.isRunning).toBe(true)
        expect(timerResult.current.isPaused).toBe(false)
      })

      // Time should be preserved exactly
      expect(timerResult.current.state.timeRemaining).toBe(pausedTimeRemaining)
      expect(timerResult.current.state.timeElapsed).toBe(pausedTimeElapsed)

      // Continue workout to completion of first round
      act(() => {
        currentTime += 90 * 1000 + 100 // Complete remaining work time
        const worker = (timerResult.current as any).timerRef.current?.worker
        if (worker && worker.forceTick) {
          worker.forceTick()
        }
      })

      await waitFor(() => {
        expect(timerResult.current.state.phase).toBe('rest')
        expect(timerResult.current.state.currentRound).toBe(1)
      })

      // Verify pause didn't disrupt audio synchronization
      const phaseChangeEvents = timerEvents.filter(e => e.type === 'phaseChange')
      expect(phaseChangeEvents.length).toBeGreaterThan(0)
    })

    /**
     * Test advanced workout with settings changes mid-workout
     * Business Rule: Settings changes should reset workout appropriately
     */
    test('should handle settings changes during advanced workout', async () => {
      const initialConfig: TimerConfig = {
        workDuration: 180, // 3 minutes
        restDuration: 60,  // 1 minute
        totalRounds: 12,
        enableWarning: true
      }

      const { result: timerResult } = renderHook(() => 
        useTimer({ 
          config: initialConfig,
          onEvent: (event) => timerEvents.push(event)
        })
      )

      const { result: audioResult } = renderHook(() => useAudio())

      await waitFor(() => {
        expect(timerResult.current.isReady).toBe(true)
      })

      // Start workout
      act(() => {
        timerResult.current.start()
      })

      currentTime = 1000

      // Progress through part of workout
      act(() => {
        currentTime += 120 * 1000 // 2 minutes into first work
        const worker = (timerResult.current as any).timerRef.current?.worker
        if (worker && worker.forceTick) {
          worker.forceTick()
        }
      })

      const preChangeState = timerResult.current.state

      // Change settings mid-workout
      act(() => {
        timerResult.current.updateConfig({
          workDuration: 240, // Increase to 4 minutes
          totalRounds: 8      // Reduce total rounds
        })
      })

      await waitFor(() => {
        // Should reset to idle with new configuration
        expect(timerResult.current.isIdle).toBe(true)
        expect(timerResult.current.config.workDuration).toBe(240)
        expect(timerResult.current.config.totalRounds).toBe(8)
        expect(timerResult.current.state.timeRemaining).toBe(240 * 1000)
      })

      // Restart with new settings
      act(() => {
        timerResult.current.start()
      })

      await waitFor(() => {
        expect(timerResult.current.isRunning).toBe(true)
      })

      // Verify new workout configuration is active
      expect(timerResult.current.config.workDuration).toBe(240)
      expect(timerResult.current.config.totalRounds).toBe(8)
    })
  })

  describe('Audio-Timer Synchronization', () => {
    /**
     * Test precise audio timing with timer events
     * Business Rule: Audio should play at exact timer transition moments
     */
    test('should synchronize audio precisely with timer events', async () => {
      const shortConfig: TimerConfig = {
        workDuration: 15,  // 15 seconds for faster testing
        restDuration: 10,  // 10 seconds
        totalRounds: 2,
        enableWarning: true
      }

      const { result: timerResult } = renderHook(() => 
        useTimer({ 
          config: shortConfig,
          onEvent: (event) => {
            timerEvents.push(event)
            
            // Trigger audio based on timer events
            if (event.type === 'phaseChange') {
              if (event.payload.newPhase === 'work') {
                audioResult.current.playRoundStart()
              } else if (event.payload.newPhase === 'rest') {
                audioResult.current.playRoundEnd()
              }
            } else if (event.type === 'warning') {
              audioResult.current.playTenSecondWarning()
            } else if (event.type === 'workoutComplete') {
              audioResult.current.playWorkoutEnd()
            }
          }
        })
      )

      const { result: audioResult } = renderHook(() => useAudio())

      await waitFor(() => {
        expect(timerResult.current.isReady).toBe(true)
      })

      await act(async () => {
        await audioResult.current.initialize()
      })

      // Start workout
      act(() => {
        timerResult.current.start()
      })

      currentTime = 1000

      // Simulate workout with precise timing tracking
      const timingLog: Array<{ event: string; timerTime: number; audioTime: number }> = []

      // Progress to 10-second warning (5 seconds remaining in work)
      act(() => {
        currentTime += 10 * 1000
        const worker = (timerResult.current as any).timerRef.current?.worker
        if (worker && worker.forceTick) {
          worker.forceTick()
        }
      })

      // Check for warning
      const warningEvents = timerEvents.filter(e => e.type === 'warning')
      if (warningEvents.length > 0) {
        const warningAudio = audioPlaybackLog.filter(log => log.type === 'warning')
        timingLog.push({
          event: 'warning',
          timerTime: warningEvents[0].state.timeRemaining,
          audioTime: warningAudio[0]?.timestamp || 0
        })
      }

      // Complete work phase
      act(() => {
        currentTime += 5 * 1000 + 100
        const worker = (timerResult.current as any).timerRef.current?.worker
        if (worker && worker.forceTick) {
          worker.forceTick()
        }
      })

      // Check for phase change to rest
      const phaseChangeEvents = timerEvents.filter(e => 
        e.type === 'phaseChange' && e.payload.newPhase === 'rest'
      )
      
      if (phaseChangeEvents.length > 0) {
        const roundEndAudio = audioPlaybackLog.filter(log => log.type === 'bell')
        timingLog.push({
          event: 'round_end',
          timerTime: 0, // Should be at work completion
          audioTime: roundEndAudio[roundEndAudio.length - 1]?.timestamp || 0
        })
      }

      // Verify audio-timer synchronization
      timingLog.forEach(log => {
        // Audio should play within 100ms of timer event
        const timeDiff = Math.abs(log.timerTime - log.audioTime)
        expect(timeDiff).toBeLessThan(100)
      })
    })

    /**
     * Test audio fallback during timer operation
     * Business Rule: Timer should continue even if audio fails
     */
    test('should continue workout when audio fails', async () => {
      const config: TimerConfig = {
        workDuration: 10,
        restDuration: 5,
        totalRounds: 2,
        enableWarning: true
      }

      // Mock audio manager to fail
      const failingAudioManager = {
        ...mockAudioManager,
        play: jest.fn(() => Promise.reject(new Error('Audio playback failed'))),
        initialize: jest.fn(() => Promise.reject(new Error('Audio init failed')))
      }

      require('../../src/lib/audio-manager').getAudioManager = jest.fn(() => failingAudioManager)

      const { result: timerResult } = renderHook(() => 
        useTimer({ 
          config,
          onEvent: (event) => timerEvents.push(event)
        })
      )

      const { result: audioResult } = renderHook(() => useAudio())

      await waitFor(() => {
        expect(timerResult.current.isReady).toBe(true)
      })

      // Audio initialization should fail but not prevent timer operation
      await act(async () => {
        try {
          await audioResult.current.initialize()
        } catch (error) {
          // Expected to fail
        }
      })

      // Timer should still work
      act(() => {
        timerResult.current.start()
      })

      await waitFor(() => {
        expect(timerResult.current.isRunning).toBe(true)
      })

      // Progress through workout
      currentTime += 10 * 1000 + 100
      act(() => {
        const worker = (timerResult.current as any).timerRef.current?.worker
        if (worker && worker.forceTick) {
          worker.forceTick()
        }
      })

      // Timer should continue despite audio failures
      await waitFor(() => {
        expect(timerResult.current.state.phase).toBe('rest')
      })

      // Audio should have error state but timer continues
      expect(audioResult.current.error).not.toBeNull()
      expect(timerResult.current.isRunning).toBe(true)
    })
  })

  describe('Error Recovery and Resilience', () => {
    /**
     * Test workout recovery from timer errors
     * Business Rule: Should handle timer errors gracefully and allow recovery
     */
    test('should recover from timer worker errors', async () => {
      const config: TimerConfig = {
        workDuration: 30,
        restDuration: 15,
        totalRounds: 2,
        enableWarning: true
      }

      const { result: timerResult } = renderHook(() => 
        useTimer({ 
          config,
          onEvent: (event) => timerEvents.push(event)
        })
      )

      await waitFor(() => {
        expect(timerResult.current.isReady).toBe(true)
      })

      act(() => {
        timerResult.current.start()
      })

      // Simulate worker error
      const worker = (timerResult.current as any).timerRef.current?.worker
      if (worker && worker.sendMessage) {
        act(() => {
          worker.sendMessage({
            type: 'error',
            message: 'Worker encountered an error',
            timestamp: currentTime
          })
        })
      }

      // Should have error in events
      await waitFor(() => {
        const errorEvents = timerEvents.filter(e => e.type === 'error')
        expect(errorEvents.length).toBeGreaterThan(0)
      })

      // Timer should still be operable for reset/restart
      expect(() => {
        timerResult.current.stop()
        timerResult.current.start()
      }).not.toThrow()
    })

    /**
     * Test workout state persistence across interruptions
     * Business Rule: Should maintain workout progress across brief interruptions
     */
    test('should maintain workout state across component re-renders', async () => {
      const config: TimerConfig = {
        workDuration: 60,
        restDuration: 30,
        totalRounds: 3,
        enableWarning: true
      }

      const { result: timerResult, rerender } = renderHook(() => 
        useTimer({ 
          config,
          onEvent: (event) => timerEvents.push(event)
        })
      )

      await waitFor(() => {
        expect(timerResult.current.isReady).toBe(true)
      })

      // Start workout and progress
      act(() => {
        timerResult.current.start()
      })

      currentTime = 30 * 1000 // 30 seconds in
      act(() => {
        const worker = (timerResult.current as any).timerRef.current?.worker
        if (worker && worker.forceTick) {
          worker.forceTick()
        }
      })

      const stateBeforeRerender = timerResult.current.state

      // Force component re-render
      rerender()

      // State should be preserved
      await waitFor(() => {
        expect(timerResult.current.isRunning).toBe(true)
        expect(timerResult.current.state.currentRound).toBe(stateBeforeRerender.currentRound)
        expect(timerResult.current.state.phase).toBe(stateBeforeRerender.phase)
      })
    })
  })

  describe('Multi-Round Workout Progression', () => {
    /**
     * Test accurate round progression and progress tracking
     * Business Rule: Should accurately track progress through all rounds
     */
    test('should track progress accurately through multiple rounds', async () => {
      const config: TimerConfig = {
        workDuration: 20,  // 20 seconds
        restDuration: 10,  // 10 seconds
        totalRounds: 4,
        enableWarning: true
      }

      const { result: timerResult } = renderHook(() => 
        useTimer({ 
          config,
          onEvent: (event) => timerEvents.push(event)
        })
      )

      await waitFor(() => {
        expect(timerResult.current.isReady).toBe(true)
      })

      act(() => {
        timerResult.current.start()
      })

      currentTime = 1000

      // Track progress through all rounds
      const progressLog: Array<{
        round: number
        phase: 'work' | 'rest'
        progress: number
        workoutProgress: number
      }> = []

      for (let round = 1; round <= config.totalRounds; round++) {
        // Work phase
        for (let workSecond = 1; workSecond <= config.workDuration; workSecond += 5) {
          currentTime += 5000
          act(() => {
            const worker = (timerResult.current as any).timerRef.current?.worker
            if (worker && worker.forceTick) {
              worker.forceTick()
            }
          })

          const state = timerResult.current.state
          progressLog.push({
            round: state.currentRound,
            phase: state.phase,
            progress: state.progress,
            workoutProgress: state.workoutProgress
          })
        }

        // Complete work phase
        currentTime += 100 // Small buffer
        act(() => {
          const worker = (timerResult.current as any).timerRef.current?.worker
          if (worker && worker.forceTick) {
            worker.forceTick()
          }
        })

        // Rest phase (except for last round)
        if (round < config.totalRounds) {
          await waitFor(() => {
            expect(timerResult.current.state.phase).toBe('rest')
          })

          currentTime += config.restDuration * 1000 + 100
          act(() => {
            const worker = (timerResult.current as any).timerRef.current?.worker
            if (worker && worker.forceTick) {
              worker.forceTick()
            }
          })
        } else {
          // Final rest
          currentTime += config.restDuration * 1000 + 100
          act(() => {
            const worker = (timerResult.current as any).timerRef.current?.worker
            if (worker && worker.forceTick) {
              worker.forceTick()
            }
          })
        }
      }

      // Verify workout completion
      await waitFor(() => {
        expect(timerResult.current.isCompleted).toBe(true)
        expect(timerResult.current.state.workoutProgress).toBe(1)
      })

      // Analyze progress log
      const finalProgress = progressLog[progressLog.length - 1]
      expect(finalProgress.workoutProgress).toBeCloseTo(1, 1)

      // Verify round progression was correct
      const roundProgression = progressLog
        .filter(log => log.phase === 'work')
        .map(log => log.round)
      
      expect(Math.max(...roundProgression)).toBe(config.totalRounds)

      // Verify all rounds completed
      const completedRounds = timerEvents
        .filter(e => e.type === 'roundComplete')
        .length
      
      expect(completedRounds).toBe(config.totalRounds)
    })
  })
})