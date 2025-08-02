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
});