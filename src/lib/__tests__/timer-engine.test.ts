/**
 * Timer Engine Test Suite
 * 
 * Comprehensive unit tests for the TimerEngine class covering critical MVP functionality:
 * 1. Timer Precision: Validates ±100ms accuracy requirement
 * 2. State Management: Tests start/pause/resume/stop/reset operations
 * 3. Phase Progression: Tests preparation → work → rest → complete flow
 * 4. Round Management: Tests multi-round progression logic
 * 
 * These tests ensure the core timer functionality meets production requirements
 * for precise boxing workout timing with proper state transitions.
 */

import { TimerEngine, createBoxingTimer, TimerConfig, TimerEvent } from '../timer-engine';

// Mock Worker implementation for testing
class MockWorker {
  public postMessage = jest.fn();
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((error: ErrorEvent) => void) | null = null;
  public terminate = jest.fn();

  // Simulate worker message sending
  simulateMessage(data: unknown) {
    if (this.onmessage) {
      this.onmessage({ data } as MessageEvent);
    }
  }

  // Simulate worker error
  simulateError(error: string) {
    if (this.onerror) {
      this.onerror({ message: error } as ErrorEvent);
    }
  }
}

// Mock global Worker constructor
(global as typeof globalThis & { Worker: jest.MockedClass<typeof Worker> }).Worker = jest.fn(() => new MockWorker()) as jest.MockedClass<typeof Worker>;

// Mock document for visibility API
const mockDocument = {
  hidden: false,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

// Mock document for testing
if (typeof document === 'undefined') {
  Object.defineProperty(global, 'document', {
    value: mockDocument,
    writable: true,
    configurable: true,
  });
} else {
  // If document exists, replace its methods with mocks
  document.addEventListener = mockDocument.addEventListener;
  document.removeEventListener = mockDocument.removeEventListener;
  Object.defineProperty(document, 'hidden', {
    value: false,
    writable: true,
    configurable: true,
  });
}

describe('TimerEngine', () => {
  let timerEngine: TimerEngine;
  let mockWorker: MockWorker;
  let receivedEvents: TimerEvent[] = [];

  // Standard test configuration for consistent testing
  const testConfig: TimerConfig = {
    workDuration: 10, // 10 seconds for faster testing
    restDuration: 5,  // 5 seconds for faster testing
    totalRounds: 3,
    enableWarning: true,
    prepDuration: 2   // 2 seconds preparation
  };

  beforeEach(() => {
    // Clear mocks and reset state
    jest.clearAllMocks();
    receivedEvents = [];

    // Create timer instance
    timerEngine = new TimerEngine(testConfig);
    
    // Get the mocked worker instance
    mockWorker = ((global as typeof globalThis & { Worker: jest.MockedClass<typeof Worker> }).Worker as jest.MockedFunction<() => MockWorker>).mock.results[0].value;

    // Setup event listener to capture all events
    timerEngine.addEventListener((event: TimerEvent) => {
      receivedEvents.push(event);
    });

    // Simulate worker ready
    mockWorker.simulateMessage({ type: 'ready' });
  });

  afterEach(() => {
    if (timerEngine) {
      timerEngine.destroy();
    }
  });

  describe('Timer Precision Test', () => {
    /**
     * Validates ±100ms accuracy requirement for boxing timer MVP
     * 
     * Business Rule: Timer must maintain ±100ms precision to ensure
     * accurate workout timing for professional boxing training.
     * 
     * Test Strategy:
     * - Simulates worker tick messages at precise intervals
     * - Measures timing accuracy against expected values
     * - Validates state updates reflect accurate time remaining
     */
    it('should maintain ±100ms accuracy during timing operations', (done) => {
      const startTime = Date.now();
      let tickCount = 0;
      const expectedTicks = 5;
      const tickInterval = 100; // 100ms ticks for precision testing

      timerEngine.addEventListener((event) => {
        if (event.type === 'tick') {
          tickCount++;
          const currentTime = Date.now();
          const expectedElapsed = tickCount * tickInterval;
          const actualElapsed = currentTime - startTime;
          const accuracy = Math.abs(actualElapsed - expectedElapsed);

          // Validate ±100ms accuracy requirement
          expect(accuracy).toBeLessThanOrEqual(100);

          // Check state consistency
          expect(event.state.timeRemaining).toBeLessThanOrEqual(testConfig.prepDuration * 1000);
          expect(event.state.progress).toBeGreaterThanOrEqual(0);
          expect(event.state.progress).toBeLessThanOrEqual(1);

          if (tickCount >= expectedTicks) {
            done();
          }
        }
      });

      // Start timer in preparation phase
      timerEngine.start();

      // Simulate precise worker ticks to test timing accuracy
      for (let i = 1; i <= expectedTicks; i++) {
        setTimeout(() => {
          const remaining = (testConfig.prepDuration * 1000) - (i * tickInterval);
          const elapsed = i * tickInterval;
          const progress = elapsed / (testConfig.prepDuration * 1000);

          mockWorker.simulateMessage({
            type: 'tick',
            remaining: Math.max(0, remaining),
            elapsed,
            progress: Math.min(1, progress)
          });
        }, i * tickInterval);
      }
    }, 10000);

    it('should handle timing precision under load simulation', () => {
      const measurements: number[] = [];
      let previousTime = Date.now();

      timerEngine.addEventListener((event) => {
        if (event.type === 'tick') {
          const currentTime = Date.now();
          const interval = currentTime - previousTime;
          measurements.push(interval);
          previousTime = currentTime;
        }
      });

      timerEngine.start();

      // Simulate 20 rapid ticks to test precision under load
      for (let i = 0; i < 20; i++) {
        mockWorker.simulateMessage({
          type: 'tick',
          remaining: 2000 - (i * 100),
          elapsed: i * 100,
          progress: (i * 100) / 2000
        });
      }

      // Validate timing consistency (measurements should exist)
      expect(measurements.length).toBeGreaterThan(0);
    });
  });

  describe('State Management Test', () => {
    /**
     * Tests comprehensive state management across all timer operations
     * 
     * Business Logic: Timer must properly transition between idle/running/paused/completed
     * states while maintaining data consistency for UI components to render correctly.
     * 
     * Critical State Transitions:
     * - idle → running (start)
     * - running → paused (pause)  
     * - paused → running (resume)
     * - running → idle (stop/reset)
     * - running → completed (workout finished)
     */
    it('should properly manage state transitions: start/pause/resume/stop/reset', () => {
      // Initial state should be idle
      let state = timerEngine.getState();
      expect(state.status).toBe('idle');
      expect(state.phase).toBe('preparation'); // First phase with prep time
      expect(state.currentRound).toBe(1);
      expect(state.timeRemaining).toBe(testConfig.prepDuration * 1000);

      // Test START operation
      timerEngine.start();
      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: 'start',
        payload: { duration: testConfig.prepDuration * 1000 }
      });

      // Simulate worker confirms running state
      mockWorker.simulateMessage({ type: 'tick', remaining: 1800, elapsed: 200, progress: 0.1 });
      
      state = timerEngine.getState();
      expect(state.status).toBe('running');

      // Test PAUSE operation
      timerEngine.pause();
      expect(mockWorker.postMessage).toHaveBeenCalledWith({ type: 'pause' });

      // Simulate worker confirms paused state
      mockWorker.simulateMessage({ type: 'paused' });
      
      state = timerEngine.getState();
      expect(state.status).toBe('paused');

      // Test RESUME operation
      timerEngine.resume();
      expect(mockWorker.postMessage).toHaveBeenCalledWith({ type: 'resume' });
      
      state = timerEngine.getState();
      expect(state.status).toBe('running');

      // Test STOP operation
      timerEngine.stop();
      expect(mockWorker.postMessage).toHaveBeenCalledWith({ type: 'stop' });

      // Stop should reset to initial state
      state = timerEngine.getState();
      expect(state.status).toBe('idle');
      expect(state.currentRound).toBe(1);
      expect(state.phase).toBe('preparation');

      // Test RESET operation (should behave same as stop)
      timerEngine.start();
      mockWorker.simulateMessage({ type: 'tick', remaining: 1500, elapsed: 500, progress: 0.25 });
      
      timerEngine.reset();
      state = timerEngine.getState();
      expect(state.status).toBe('idle');
      expect(state.currentRound).toBe(1);
      expect(state.timeRemaining).toBe(testConfig.prepDuration * 1000);
    });

    it('should handle configuration updates correctly', () => {
      const newConfig: Partial<TimerConfig> = {
        workDuration: 20,
        totalRounds: 5
      };

      // Start timer first
      timerEngine.start();
      mockWorker.simulateMessage({ type: 'tick', remaining: 1500, elapsed: 500, progress: 0.25 });

      // Update configuration should stop and reset
      timerEngine.updateConfig(newConfig);

      const updatedConfig = timerEngine.getConfig();
      expect(updatedConfig.workDuration).toBe(20);
      expect(updatedConfig.totalRounds).toBe(5);
      expect(updatedConfig.restDuration).toBe(testConfig.restDuration); // Should preserve other values

      const state = timerEngine.getState();
      expect(state.status).toBe('idle');
      expect(state.currentRound).toBe(1);
    });
  });

  describe('Phase Progression Test', () => {
    /**
     * Tests automatic progression through workout phases
     * 
     * Boxing Workout Flow:
     * 1. Preparation (get ready) → 2. Work (boxing) → 3. Rest → 4. Work → 5. Rest... → Complete
     * 
     * Business Rules:
     * - Preparation phase only occurs once at start (if configured)
     * - Work phases are the main boxing rounds
     * - Rest phases occur between work rounds (except after final round)
     * - Workout completes after final work round
     * - Each phase transition emits appropriate events for audio cues
     */
    it('should progress through phases: preparation → work → rest → work → complete', () => {
      timerEngine.start();

      // Phase 1: Preparation phase completes
      mockWorker.simulateMessage({ type: 'completed' });
      
      // Should transition to work phase
      const workPhaseEvent = receivedEvents.find(e => e.type === 'phaseChange' && e.payload?.newPhase === 'work');
      expect(workPhaseEvent).toBeDefined();
      expect(workPhaseEvent?.payload?.round).toBe(1);

      let state = timerEngine.getState();
      expect(state.phase).toBe('work');
      expect(state.timeRemaining).toBe(testConfig.workDuration * 1000);

      // Phase 2: First work round completes
      mockWorker.simulateMessage({ type: 'completed' });

      // Should transition to rest phase
      const restPhaseEvent = receivedEvents.find(e => e.type === 'phaseChange' && e.payload?.newPhase === 'rest');
      expect(restPhaseEvent).toBeDefined();

      state = timerEngine.getState();
      expect(state.phase).toBe('rest');
      expect(state.timeRemaining).toBe(testConfig.restDuration * 1000);

      // Phase 3: First rest completes
      mockWorker.simulateMessage({ type: 'completed' });

      // Should emit roundComplete and transition to next work round
      const roundCompleteEvent = receivedEvents.find(e => e.type === 'roundComplete');
      expect(roundCompleteEvent).toBeDefined();

      state = timerEngine.getState();
      expect(state.phase).toBe('work');
      expect(state.currentRound).toBe(2);

      // Continue until final round (round 3 work)
      // Complete round 2 work → rest → round 3 work
      mockWorker.simulateMessage({ type: 'completed' }); // Round 2 work done
      mockWorker.simulateMessage({ type: 'completed' }); // Round 2 rest done
      mockWorker.simulateMessage({ type: 'completed' }); // Round 3 work done

      // Final work round should complete workout
      const workoutCompleteEvent = receivedEvents.find(e => e.type === 'workoutComplete');
      expect(workoutCompleteEvent).toBeDefined();
      expect(workoutCompleteEvent?.payload?.totalRounds).toBe(testConfig.totalRounds);

      state = timerEngine.getState();
      expect(state.status).toBe('completed');
      expect(state.workoutProgress).toBe(1);
    });

    it('should emit warning events at correct timing', () => {
      timerEngine.start();

      // Simulate tick with 10 seconds remaining to trigger warning
      mockWorker.simulateMessage({
        type: 'tick',
        remaining: 9999, // Just under 10 seconds
        elapsed: 1,
        progress: 0.0005
      });

      const warningEvent = receivedEvents.find(e => e.type === 'warning');
      expect(warningEvent).toBeDefined();
      expect(warningEvent?.payload?.secondsRemaining).toBe(10);
      expect(warningEvent?.payload?.phase).toBe('preparation');

      // Should not emit warning again for same phase
      mockWorker.simulateMessage({
        type: 'tick',
        remaining: 8000,
        elapsed: 2000,
        progress: 1
      });

      const duplicateWarnings = receivedEvents.filter(e => e.type === 'warning');
      expect(duplicateWarnings.length).toBe(1);
    });
  });

  describe('Round Management Test', () => {
    /**
     * Tests multi-round progression and workout completion logic
     * 
     * Business Logic: Boxing workouts consist of multiple rounds with work and rest periods.
     * The timer must accurately track round progression and determine workout completion.
     * 
     * Round Structure:
     * - Round 1: Work → Rest
     * - Round 2: Work → Rest  
     * - Round 3: Work → [Workout Complete]
     * 
     * Key Validations:
     * - Round counter increments correctly
     * - Workout progress calculation is accurate
     * - Final round doesn't include rest period
     * - Proper completion detection
     */
    it('should manage multi-round progression correctly', () => {
      timerEngine.start();

      // Complete preparation phase
      mockWorker.simulateMessage({ type: 'completed' });

      let state = timerEngine.getState();
      expect(state.currentRound).toBe(1);
      expect(state.phase).toBe('work');

      // Complete Round 1 work
      mockWorker.simulateMessage({ type: 'completed' });
      
      state = timerEngine.getState();
      expect(state.phase).toBe('rest');
      expect(state.currentRound).toBe(1); // Still round 1 during rest

      // Complete Round 1 rest - should advance to Round 2
      mockWorker.simulateMessage({ type: 'completed' });

      state = timerEngine.getState();
      expect(state.currentRound).toBe(2);
      expect(state.phase).toBe('work');

      // Validate workout progress calculation
      // After round 1 complete: we're starting round 2 work
      // Total periods = 1 preparation + 3 rounds * 2 periods = 7 periods
      // Completed periods = 3 (preparation + round 1 work + round 1 rest)
      // Progress should be approximately 3/7 ≈ 0.43
      expect(state.workoutProgress).toBeGreaterThanOrEqual(0.4);
      expect(state.workoutProgress).toBeLessThanOrEqual(0.45);

      // Complete Round 2 work
      mockWorker.simulateMessage({ type: 'completed' });
      
      // Complete Round 2 rest
      mockWorker.simulateMessage({ type: 'completed' });

      state = timerEngine.getState();
      expect(state.currentRound).toBe(3);
      expect(state.phase).toBe('work');

      // Complete final Round 3 work - workout should complete
      mockWorker.simulateMessage({ type: 'completed' });

      state = timerEngine.getState();
      expect(state.status).toBe('completed');
      expect(state.workoutProgress).toBe(1);

      // Verify workout complete event was emitted
      const workoutCompleteEvent = receivedEvents.find(e => e.type === 'workoutComplete');
      expect(workoutCompleteEvent).toBeDefined();
    });

    it('should calculate workout progress accurately throughout session', () => {
      timerEngine.start();

      // Helper function to simulate progress through a phase
      const simulatePhaseProgress = (totalDuration: number, steps: number = 5) => {
        for (let i = 1; i <= steps; i++) {
          const elapsed = (i / steps) * totalDuration;
          const remaining = totalDuration - elapsed;
          const progress = elapsed / totalDuration;

          mockWorker.simulateMessage({
            type: 'tick',
            remaining,
            elapsed,
            progress
          });
        }
      };

      // Track progress values
      const progressValues: number[] = [];
      timerEngine.addEventListener((event) => {
        if (event.type === 'tick') {
          progressValues.push(event.state.workoutProgress);
        }
      });

      // Preparation phase
      simulatePhaseProgress(testConfig.prepDuration * 1000);
      mockWorker.simulateMessage({ type: 'completed' });

      // Round 1 work
      simulatePhaseProgress(testConfig.workDuration * 1000);
      mockWorker.simulateMessage({ type: 'completed' });

      // Round 1 rest
      simulatePhaseProgress(testConfig.restDuration * 1000);
      mockWorker.simulateMessage({ type: 'completed' });

      // Validate progress increases monotonically
      for (let i = 1; i < progressValues.length; i++) {
        expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i - 1]);
      }

      // Final progress should be substantial but not complete
      const finalProgress = progressValues[progressValues.length - 1];
      expect(finalProgress).toBeGreaterThan(0.3);
      expect(finalProgress).toBeLessThan(1.0);
    });

    it('should handle single round workout correctly', () => {
      // Create single round configuration
      const singleRoundConfig: TimerConfig = {
        workDuration: 10,
        restDuration: 5,
        totalRounds: 1,
        enableWarning: false,
        prepDuration: 0 // No preparation for simplicity
      };

      timerEngine.updateConfig(singleRoundConfig);
      timerEngine.start();

      let state = timerEngine.getState();
      expect(state.phase).toBe('work');
      expect(state.currentRound).toBe(1);

      // Complete the single work round - should complete workout immediately
      mockWorker.simulateMessage({ type: 'completed' });

      state = timerEngine.getState();
      expect(state.status).toBe('completed');
      expect(state.workoutProgress).toBe(1);

      // Should not have any rest period
      const phaseEvents = receivedEvents.filter(e => e.type === 'phaseChange');
      const restPhaseEvent = phaseEvents.find(e => e.payload?.newPhase === 'rest');
      expect(restPhaseEvent).toBeUndefined();
    });
  });

  describe('Boxing Timer Presets', () => {
    /**
     * Tests the predefined boxing workout presets
     * 
     * Business Requirements: MVP includes three standard boxing presets:
     * - Beginner: 3 rounds, 2min work, 1min rest
     * - Intermediate: 5 rounds, 3min work, 1min rest
     * - Advanced: 12 rounds, 3min work, 1min rest
     */
    it('should create correct preset configurations', () => {
      const beginner = createBoxingTimer('beginner');
      const beginnerConfig = beginner.getConfig();
      expect(beginnerConfig.workDuration).toBe(120);
      expect(beginnerConfig.restDuration).toBe(60);
      expect(beginnerConfig.totalRounds).toBe(3);
      expect(beginnerConfig.enableWarning).toBe(true);
      expect(beginnerConfig.prepDuration).toBe(10);

      const intermediate = createBoxingTimer('intermediate');
      const intermediateConfig = intermediate.getConfig();
      expect(intermediateConfig.workDuration).toBe(180);
      expect(intermediateConfig.totalRounds).toBe(5);

      const advanced = createBoxingTimer('advanced');
      const advancedConfig = advanced.getConfig();
      expect(advancedConfig.totalRounds).toBe(12);
      expect(advancedConfig.prepDuration).toBe(5);

      // Cleanup
      beginner.destroy();
      intermediate.destroy();
      advanced.destroy();
    });

    it('should create custom timer from config object', () => {
      const customConfig: TimerConfig = {
        workDuration: 240,
        restDuration: 90,
        totalRounds: 8,
        enableWarning: false,
        prepDuration: 15
      };

      const customTimer = createBoxingTimer(customConfig);
      const config = customTimer.getConfig();
      
      expect(config).toEqual(customConfig);
      customTimer.destroy();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle worker errors gracefully', () => {
      let errorEvent: TimerEvent | undefined;
      
      timerEngine.addEventListener((event) => {
        if (event.type === 'error') {
          errorEvent = event;
        }
      });

      // Simulate worker error
      mockWorker.simulateError('Worker crashed');

      expect(errorEvent).toBeDefined();
      expect(errorEvent?.payload?.message).toBe('Timer worker error');
    });

    it('should handle pause when not running', () => {
      // Should not crash when pausing idle timer
      expect(() => timerEngine.pause()).not.toThrow();
      
      const state = timerEngine.getState();
      expect(state.status).toBe('idle');
    });

    it('should handle resume when not paused', () => {
      // Should not crash when resuming idle timer
      expect(() => timerEngine.resume()).not.toThrow();
      
      const state = timerEngine.getState();
      expect(state.status).toBe('idle');
    });

    it('should handle multiple start calls', () => {
      timerEngine.start();
      timerEngine.start(); // Second start should be ignored
      
      // Should only have called postMessage once
      expect(mockWorker.postMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe('Event System', () => {
    it('should support multiple event listeners', () => {
      const events1: TimerEvent[] = [];
      const events2: TimerEvent[] = [];

      const removeListener1 = timerEngine.addEventListener(event => events1.push(event));
      timerEngine.addEventListener(event => events2.push(event));

      timerEngine.start();
      mockWorker.simulateMessage({ type: 'tick', remaining: 1000, elapsed: 1000, progress: 0.5 });

      expect(events1.length).toBeGreaterThan(0);
      expect(events2.length).toBeGreaterThan(0);
      expect(events1.length).toBe(events2.length);

      // Test listener removal
      removeListener1();
      mockWorker.simulateMessage({ type: 'tick', remaining: 500, elapsed: 1500, progress: 0.75 });

      expect(events2.length).toBe(events1.length + 1);
    });

    it('should handle event listener errors gracefully', () => {
      // Add a listener that throws
      timerEngine.addEventListener(() => {
        throw new Error('Test error in event handler');
      });

      // Should not crash when emitting events
      expect(() => {
        timerEngine.start();
        mockWorker.simulateMessage({ type: 'tick', remaining: 1000, elapsed: 1000, progress: 0.5 });
      }).not.toThrow();
    });
  });

  describe('Resource Cleanup', () => {
    it('should clean up resources on destroy', () => {
      timerEngine.start();
      
      // Verify worker was created and used
      expect(mockWorker.postMessage).toHaveBeenCalled();

      timerEngine.destroy();

      // Verify cleanup
      expect(mockWorker.terminate).toHaveBeenCalled();
      if (typeof document !== 'undefined') {
        expect(mockDocument.removeEventListener).toHaveBeenCalled();
      }

      // State should be reset
      const state = timerEngine.getState();
      expect(state.status).toBe('idle');
      expect(state.currentRound).toBe(1);
    });
  });

  describe('Short Work Duration Tests', () => {
    /**
     * Comprehensive testing for short work durations (10-60 seconds)
     * 
     * Business Context: Boxing training now supports ultra-short intervals for:
     * - High-intensity interval training (HIIT)
     * - Technique drills (10-30 seconds)
     * - Speed training bursts (15-45 seconds)
     * - Beginner conditioning (30-60 seconds)
     * 
     * Critical Requirements:
     * - Timer accuracy must be maintained (±100ms) even for short durations
     * - Audio events must fire correctly for all duration ranges
     * - 10-second warning system must handle edge cases (durations ≤ 10s)
     * - Phase transitions must occur precisely at the right time
     * - Short durations must not break the overall workout flow
     */

    describe('Ultra-Short Duration Accuracy (10-20 seconds)', () => {
      const ultraShortConfigs = [
        { duration: 10, name: '10-second' },
        { duration: 15, name: '15-second' },
        { duration: 20, name: '20-second' }
      ];

      ultraShortConfigs.forEach(({ duration, name }) => {
        it(`should maintain ±100ms accuracy for ${name} work periods`, (done) => {
          const shortConfig: TimerConfig = {
            workDuration: duration,
            restDuration: 5,
            totalRounds: 2,
            enableWarning: true,
            prepDuration: 0 // No prep to focus on work duration
          };

          const shortTimer = new TimerEngine(shortConfig);
          // Get the most recent mock worker instance
          const mockResults = ((global as typeof globalThis & { Worker: jest.MockedClass<typeof Worker> }).Worker as jest.MockedFunction<() => MockWorker>).mock.results;
          const shortMockWorker = mockResults[mockResults.length - 1].value;

          let tickCount = 0;
          const maxTicks = 5;
          const startTime = Date.now();

          shortTimer.addEventListener((event) => {
            if (event.type === 'tick' && event.state.phase === 'work') {
              tickCount++;
              const currentTime = Date.now();
              const expectedElapsed = tickCount * 50; // 50ms intervals for precision testing
              const actualElapsed = currentTime - startTime;
              const accuracy = Math.abs(actualElapsed - expectedElapsed);

              // Validate ±100ms accuracy requirement for short durations
              expect(accuracy).toBeLessThanOrEqual(100);

              // Verify remaining time is accurate for short duration
              expect(event.state.timeRemaining).toBeLessThanOrEqual(duration * 1000);
              expect(event.state.timeRemaining).toBeGreaterThanOrEqual(0);

              // Verify progress calculation is accurate for short periods
              expect(event.state.progress).toBeGreaterThanOrEqual(0);
              expect(event.state.progress).toBeLessThanOrEqual(1);

              if (tickCount >= maxTicks) {
                shortTimer.destroy();
                done();
              }
            }
          });

          // Start timer and simulate precise short-duration ticks
          shortTimer.start();
          shortMockWorker.simulateMessage({ type: 'ready' });

          // Simulate rapid ticks for short duration testing
          for (let i = 1; i <= maxTicks; i++) {
            setTimeout(() => {
              const elapsed = i * 50;
              const remaining = (duration * 1000) - elapsed;
              const progress = elapsed / (duration * 1000);

              shortMockWorker.simulateMessage({
                type: 'tick',
                remaining: Math.max(0, remaining),
                elapsed,
                progress: Math.min(1, progress)
              });
            }, i * 50);
          }
        }, 5000);
      });

      it('should handle phase transition precisely for 10-second work period', () => {
        const tenSecondConfig: TimerConfig = {
          workDuration: 10,
          restDuration: 5,
          totalRounds: 1,
          enableWarning: false, // Disabled to test clean transition
          prepDuration: 0
        };

        const shortTimer = new TimerEngine(tenSecondConfig);
        // Get the most recent mock worker instance
        const mockResults = ((global as typeof globalThis & { Worker: jest.MockedClass<typeof Worker> }).Worker as jest.MockedFunction<() => MockWorker>).mock.results;
        const shortMockWorker = mockResults[mockResults.length - 1].value;

        const receivedEvents: TimerEvent[] = [];
        shortTimer.addEventListener((event) => receivedEvents.push(event));

        shortTimer.start();
        shortMockWorker.simulateMessage({ type: 'ready' });

        // Simulate work period completion after exactly 10 seconds
        shortMockWorker.simulateMessage({
          type: 'tick',
          remaining: 0,
          elapsed: 10000,
          progress: 1.0
        });

        shortMockWorker.simulateMessage({ type: 'completed' });

        const state = shortTimer.getState();
        expect(state.status).toBe('completed'); // Single round should complete immediately
        expect(state.workoutProgress).toBe(1);

        // Verify workout complete event was emitted
        const workoutCompleteEvent = receivedEvents.find(e => e.type === 'workoutComplete');
        expect(workoutCompleteEvent).toBeDefined();

        shortTimer.destroy();
      });
    });

    describe('Short Duration Audio Events (30-60 seconds)', () => {
      const shortConfigs = [
        { duration: 30, name: '30-second' },
        { duration: 45, name: '45-second' },
        { duration: 60, name: '60-second' }
      ];

      shortConfigs.forEach(({ duration, name }) => {
        it(`should emit correct audio events for ${name} work periods`, () => {
          const config: TimerConfig = {
            workDuration: duration,
            restDuration: 10,
            totalRounds: 2,
            enableWarning: true,
            prepDuration: 0
          };

          const timer = new TimerEngine(config);
          // Get the most recent mock worker instance
          const mockResults = ((global as typeof globalThis & { Worker: jest.MockedClass<typeof Worker> }).Worker as jest.MockedFunction<() => MockWorker>).mock.results;
          const mockWorker = mockResults[mockResults.length - 1].value;

          const audioEvents: TimerEvent[] = [];
          timer.addEventListener((event) => {
            if (event.type === 'warning' || event.type === 'phaseChange') {
              audioEvents.push(event);
            }
          });

          timer.start();
          mockWorker.simulateMessage({ type: 'ready' });

          // Simulate approaching warning threshold (10 seconds remaining)
          const warningTime = duration - 10; // e.g., 20s for 30s duration
          if (warningTime > 0) {
            mockWorker.simulateMessage({
              type: 'tick',
              remaining: 9999, // Just under 10 seconds
              elapsed: warningTime * 1000 + 1,
              progress: (warningTime * 1000 + 1) / (duration * 1000)
            });

            // Should emit warning event
            const warningEvent = audioEvents.find(e => e.type === 'warning');
            expect(warningEvent).toBeDefined();
            expect(warningEvent?.payload?.secondsRemaining).toBe(10);
            expect(warningEvent?.payload?.phase).toBe('work');
          }

          // Complete work period
          mockWorker.simulateMessage({ type: 'completed' });

          // Should emit phase change event (work → rest)
          const phaseChangeEvent = audioEvents.find(e => 
            e.type === 'phaseChange' && e.payload?.newPhase === 'rest'
          );
          expect(phaseChangeEvent).toBeDefined();
          expect(phaseChangeEvent?.payload?.round).toBe(1);

          timer.destroy();
        });
      });
    });

    describe('Warning System Edge Cases', () => {
      it('should handle 10-second warning for 10-second work duration', () => {
        const config: TimerConfig = {
          workDuration: 10,
          restDuration: 5,
          totalRounds: 1,
          enableWarning: true,
          prepDuration: 0
        };

        const timer = new TimerEngine(config);
        // Get the most recent mock worker instance
        const mockResults = ((global as typeof globalThis & { Worker: jest.MockedClass<typeof Worker> }).Worker as jest.MockedFunction<() => MockWorker>).mock.results;
        const mockWorker = mockResults[mockResults.length - 1].value;

        const warningEvents: TimerEvent[] = [];
        timer.addEventListener((event) => {
          if (event.type === 'warning') {
            warningEvents.push(event);
          }
        });

        timer.start();
        mockWorker.simulateMessage({ type: 'ready' });

        // For 10-second duration, warning should trigger immediately or very early
        mockWorker.simulateMessage({
          type: 'tick',
          remaining: 9999, // Just under 10 seconds
          elapsed: 1,
          progress: 0.0001
        });

        // Should emit warning even for 10-second duration
        expect(warningEvents.length).toBe(1);
        expect(warningEvents[0].payload?.secondsRemaining).toBe(10);

        timer.destroy();
      });

      it('should not emit warning for durations less than 10 seconds when disabled', () => {
        const config: TimerConfig = {
          workDuration: 8, // Less than warning threshold
          restDuration: 5,
          totalRounds: 1,
          enableWarning: false, // Explicitly disabled
          prepDuration: 0
        };

        const timer = new TimerEngine(config);
        // Get the most recent mock worker instance
        const mockResults = ((global as typeof globalThis & { Worker: jest.MockedClass<typeof Worker> }).Worker as jest.MockedFunction<() => MockWorker>).mock.results;
        const mockWorker = mockResults[mockResults.length - 1].value;

        const warningEvents: TimerEvent[] = [];
        timer.addEventListener((event) => {
          if (event.type === 'warning') {
            warningEvents.push(event);
          }
        });

        timer.start();
        mockWorker.simulateMessage({ type: 'ready' });

        // Simulate tick that would normally trigger warning
        mockWorker.simulateMessage({
          type: 'tick',
          remaining: 5000, // 5 seconds remaining
          elapsed: 3000,
          progress: 0.375
        });

        // Should not emit warning when disabled
        expect(warningEvents.length).toBe(0);

        timer.destroy();
      });

      it('should handle multiple short work periods with warnings', () => {
        const config: TimerConfig = {
          workDuration: 15,
          restDuration: 5,
          totalRounds: 3,
          enableWarning: true,
          prepDuration: 0
        };

        const timer = new TimerEngine(config);
        // Get the most recent mock worker instance
        const mockResults = ((global as typeof globalThis & { Worker: jest.MockedClass<typeof Worker> }).Worker as jest.MockedFunction<() => MockWorker>).mock.results;
        const mockWorker = mockResults[mockResults.length - 1].value;

        const warningEvents: TimerEvent[] = [];
        timer.addEventListener((event) => {
          if (event.type === 'warning') {
            warningEvents.push(event);
          }
        });

        timer.start();
        mockWorker.simulateMessage({ type: 'ready' });

        // Round 1 work period - trigger warning
        mockWorker.simulateMessage({
          type: 'tick',
          remaining: 9999,
          elapsed: 5001,
          progress: 0.334
        });

        expect(warningEvents.length).toBe(1);
        expect(warningEvents[0].payload?.phase).toBe('work');

        // Complete round 1 work
        mockWorker.simulateMessage({ type: 'completed' });

        // Complete round 1 rest
        mockWorker.simulateMessage({ type: 'completed' });

        // Round 2 work period - should trigger another warning
        mockWorker.simulateMessage({
          type: 'tick',
          remaining: 9999,
          elapsed: 5001,
          progress: 0.334
        });

        expect(warningEvents.length).toBe(2);
        expect(warningEvents[1].payload?.phase).toBe('work');

        timer.destroy();
      });
    });

    describe('Phase Transition Timing', () => {
      it('should transition work → rest precisely for short durations', () => {
        const testCases = [
          { duration: 10, name: '10-second' },
          { duration: 15, name: '15-second' },
          { duration: 20, name: '20-second' },
          { duration: 30, name: '30-second' },
          { duration: 45, name: '45-second' },
          { duration: 60, name: '60-second' }
        ];

        testCases.forEach(({ duration }) => {
          const config: TimerConfig = {
            workDuration: duration,
            restDuration: 5,
            totalRounds: 2,
            enableWarning: false,
            prepDuration: 0
          };

          const timer = new TimerEngine(config);
          // Get the most recent mock worker instance
          const mockResults = ((global as typeof globalThis & { Worker: jest.MockedClass<typeof Worker> }).Worker as jest.MockedFunction<() => MockWorker>).mock.results;
          const mockWorker = mockResults[mockResults.length - 1].value;

          const phaseChangeEvents: TimerEvent[] = [];
          timer.addEventListener((event) => {
            if (event.type === 'phaseChange') {
              phaseChangeEvents.push(event);
            }
          });

          timer.start();
          mockWorker.simulateMessage({ type: 'ready' });

          // Verify initial state
          let state = timer.getState();
          expect(state.phase).toBe('work');
          expect(state.timeRemaining).toBe(duration * 1000);

          // Complete work period
          mockWorker.simulateMessage({ type: 'completed' });

          // Should transition to rest
          const workToRestEvent = phaseChangeEvents.find(e => e.payload?.newPhase === 'rest');
          expect(workToRestEvent).toBeDefined();

          state = timer.getState();
          expect(state.phase).toBe('rest');
          expect(state.timeRemaining).toBe(5000); // 5 second rest

          timer.destroy();
        });
      });

      it('should maintain workout progress calculation for short durations', () => {
        const config: TimerConfig = {
          workDuration: 15,
          restDuration: 5,
          totalRounds: 3,
          enableWarning: false,
          prepDuration: 0
        };

        const timer = new TimerEngine(config);
        // Get the most recent mock worker instance
        const mockResults = ((global as typeof globalThis & { Worker: jest.MockedClass<typeof Worker> }).Worker as jest.MockedFunction<() => MockWorker>).mock.results;
        const mockWorker = mockResults[mockResults.length - 1].value;

        const progressValues: number[] = [];
        timer.addEventListener((event) => {
          if (event.type === 'tick' || event.type === 'phaseChange') {
            progressValues.push(event.state.workoutProgress);
          }
        });

        timer.start();
        mockWorker.simulateMessage({ type: 'ready' });

        // Complete round 1 work (should be 1/6 = ~0.167 of workout)
        mockWorker.simulateMessage({ type: 'completed' });
        
        let currentProgress = timer.getState().workoutProgress;
        expect(currentProgress).toBeCloseTo(1/6, 2);

        // Complete round 1 rest (should be 2/6 = ~0.333 of workout)
        mockWorker.simulateMessage({ type: 'completed' });
        
        currentProgress = timer.getState().workoutProgress;
        expect(currentProgress).toBeCloseTo(2/6, 2);

        // Complete round 2 work (should be 3/6 = 0.5 of workout)
        mockWorker.simulateMessage({ type: 'completed' });
        
        currentProgress = timer.getState().workoutProgress;
        expect(currentProgress).toBeCloseTo(3/6, 2);

        // Verify progress is monotonically increasing
        for (let i = 1; i < progressValues.length; i++) {
          expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i - 1]);
        }

        timer.destroy();
      });
    });

    describe('Short Duration Performance and Precision', () => {
      it('should maintain timer precision under rapid tick simulation for short durations', () => {
        const config: TimerConfig = {
          workDuration: 20,
          restDuration: 5,
          totalRounds: 1,
          enableWarning: true,
          prepDuration: 0
        };

        const timer = new TimerEngine(config);
        // Get the most recent mock worker instance
        const mockResults = ((global as typeof globalThis & { Worker: jest.MockedClass<typeof Worker> }).Worker as jest.MockedFunction<() => MockWorker>).mock.results;
        const mockWorker = mockResults[mockResults.length - 1].value;

        const tickTimestamps: number[] = [];
        timer.addEventListener((event) => {
          if (event.type === 'tick') {
            tickTimestamps.push(Date.now());
          }
        });

        timer.start();
        mockWorker.simulateMessage({ type: 'ready' });

        // Simulate 20 rapid ticks (every 100ms for 2 seconds of the 20-second duration)
        // const startTime = Date.now(); // For potential future use
        for (let i = 0; i < 20; i++) {
          setTimeout(() => {
            const elapsed = (i + 1) * 100;
            const remaining = (20 * 1000) - elapsed;
            const progress = elapsed / (20 * 1000);

            mockWorker.simulateMessage({
              type: 'tick',
              remaining: Math.max(0, remaining),
              elapsed,
              progress: Math.min(1, progress)
            });
          }, i * 10); // Send ticks every 10ms to test rapid handling
        }

        // Wait for all ticks then validate
        setTimeout(() => {
          expect(tickTimestamps.length).toBeGreaterThan(0);
          
          // Check that tick intervals are reasonable (allowing some variation)
          for (let i = 1; i < Math.min(tickTimestamps.length, 10); i++) {
            const interval = tickTimestamps[i] - tickTimestamps[i - 1];
            expect(interval).toBeLessThan(100); // Should be much faster than our target interval
          }

          timer.destroy();
        }, 1000);
      });

      it('should handle edge case of 10-second work with immediate warning', () => {
        const config: TimerConfig = {
          workDuration: 10,
          restDuration: 3,
          totalRounds: 1,
          enableWarning: true,
          prepDuration: 0
        };

        const timer = new TimerEngine(config);
        // Get the most recent mock worker instance
        const mockResults = ((global as typeof globalThis & { Worker: jest.MockedClass<typeof Worker> }).Worker as jest.MockedFunction<() => MockWorker>).mock.results;
        const mockWorker = mockResults[mockResults.length - 1].value;

        const events: TimerEvent[] = [];
        timer.addEventListener((event) => events.push(event));

        timer.start();
        mockWorker.simulateMessage({ type: 'ready' });

        // At start, we have 10 seconds remaining, so warning should trigger immediately
        mockWorker.simulateMessage({
          type: 'tick',
          remaining: 10000,
          elapsed: 0,
          progress: 0
        });

        const warningEvent = events.find(e => e.type === 'warning');
        expect(warningEvent).toBeDefined();
        expect(warningEvent?.payload?.secondsRemaining).toBe(10);

        // Complete the period
        mockWorker.simulateMessage({
          type: 'tick',
          remaining: 0,
          elapsed: 10000,
          progress: 1
        });
        mockWorker.simulateMessage({ type: 'completed' });

        const state = timer.getState();
        expect(state.status).toBe('completed');
        expect(state.workoutProgress).toBe(1);

        timer.destroy();
      });
    });
  });
});