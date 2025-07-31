/**
 * Timer Test Helper Utilities
 * 
 * Comprehensive utility functions for testing timer functionality:
 * - Mock timer creation and state management
 * - Precision testing and validation helpers
 * - Timer event simulation and verification
 * - Cross-browser timing mock implementations
 * - Performance measurement utilities
 */

import { TimerConfig, TimerState, TimerEvent } from '../../src/lib/timer-engine'

export interface MockTimerOptions {
  precision?: number
  driftVariance?: number
  performanceVariance?: number
}

export interface TimerTestScenario {
  name: string
  config: TimerConfig
  expectedDuration: number
  checkpoints: Array<{ time: number; expectedState: Partial<TimerState> }>
}

/**
 * Create mock performance.now with controlled timing
 * Business Rule: Mock timing should simulate real-world browser behavior
 */
export function createMockPerformanceNow(options: MockTimerOptions = {}) {
  const { precision = 0.1, driftVariance = 0, performanceVariance = 0 } = options
  let currentTime = Date.now()
  
  return jest.fn(() => {
    const drift = driftVariance * (Math.random() - 0.5) * 2
    const variance = performanceVariance * (Math.random() - 0.5) * 2
    return currentTime + drift + variance + (Math.random() * precision)
  })
}

/**
 * Standard timer test configurations
 * Business Rule: Consistent test configurations for reproducible testing
 */
export const TEST_CONFIGS = {
  quick: {
    workDuration: 5,
    restDuration: 3,
    totalRounds: 2,
    enableWarning: true
  },
  standard: {
    workDuration: 180,
    restDuration: 60,
    totalRounds: 5,
    enableWarning: true
  },
  extended: {
    workDuration: 300,
    restDuration: 90,
    totalRounds: 12,
    enableWarning: true
  }
} as const

/**
 * Create timer test scenario with expected checkpoints
 * Business Rule: Test scenarios should validate timer behavior at key points
 */
export function createTimerTestScenario(
  name: string,
  config: TimerConfig,
  checkpoints: Array<{ time: number; expectedState: Partial<TimerState> }>
): TimerTestScenario {
  const expectedDuration = calculateWorkoutDuration(config)
  
  return {
    name,
    config,
    expectedDuration,
    checkpoints
  }
}

/**
 * Calculate expected workout duration
 * Business Rule: Total duration = (work + rest) * rounds - final rest
 */
export function calculateWorkoutDuration(config: TimerConfig): number {
  return (config.workDuration + config.restDuration) * config.totalRounds - config.restDuration
}

/**
 * Validate timer precision within tolerance
 * Business Rule: Timer must maintain ±100ms precision
 */
export function validateTimerPrecision(
  expected: number,
  actual: number,
  tolerance: number = 100
): { isValid: boolean; precision: number } {
  const precision = Math.abs(expected - actual)
  return {
    isValid: precision <= tolerance,
    precision
  }
}

/**
 * Create timer event matcher for testing
 */
export function createTimerEventMatcher(eventType: string, expectedPayload?: any) {
  return expect.objectContaining({
    type: eventType,
    timestamp: expect.any(Number),
    state: expect.objectContaining({
      status: expect.any(String),
      phase: expect.any(String),
      currentRound: expect.any(Number),
      timeRemaining: expect.any(Number),
      timeElapsed: expect.any(Number)
    }),
    ...(expectedPayload && { payload: expect.objectContaining(expectedPayload) })
  })
}

/**
 * Wait for timer state condition
 */
export async function waitForTimerState(
  getState: () => TimerState,
  condition: (state: TimerState) => boolean,
  timeout: number = 5000
): Promise<TimerState> {
  const startTime = Date.now()
  
  while (Date.now() - startTime < timeout) {
    const state = getState()
    if (condition(state)) {
      return state
    }
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  
  throw new Error(`Timer state condition not met within ${timeout}ms`)
}

/**
 * Simulate timer progression with controlled timing
 */
export class TimerProgressionSimulator {
  private mockTime = 0
  private intervals: Array<{ callback: Function; delay: number; lastCall: number }> = []
  
  constructor(private mockPerformanceNow: jest.Mock) {
    this.mockPerformanceNow.mockImplementation(() => this.mockTime)
  }
  
  advanceTime(milliseconds: number): void {
    const targetTime = this.mockTime + milliseconds
    
    while (this.mockTime < targetTime) {
      this.mockTime += 16 // Simulate 60fps
      
      // Trigger any intervals that should fire
      this.intervals.forEach(interval => {
        if (this.mockTime - interval.lastCall >= interval.delay) {
          interval.callback()
          interval.lastCall = this.mockTime
        }
      })
    }
    
    this.mockTime = targetTime
  }
  
  getCurrentTime(): number {
    return this.mockTime
  }
  
  reset(): void {
    this.mockTime = 0
    this.intervals = []
  }
}

export default {
  createMockPerformanceNow,
  TEST_CONFIGS,
  createTimerTestScenario,
  calculateWorkoutDuration,
  validateTimerPrecision,
  createTimerEventMatcher,
  waitForTimerState,
  TimerProgressionSimulator
}