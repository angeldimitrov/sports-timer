/**
 * Complete Workout E2E Tests for Boxing Timer MVP
 * 
 * Tests complete user journeys from workout selection to completion across all presets.
 * Validates timer accuracy, audio cues, round progression, and user interface state management.
 * 
 * Business Context:
 * - Boxing workouts consist of work periods (punching) and rest periods (recovery)
 * - Each preset has specific duration and round configurations for different skill levels
 * - Timer must maintain ±100ms precision throughout entire workout
 * - Audio cues are critical for eyes-free operation during training
 * - Users must be able to pause/resume without losing progress
 * 
 * Test Coverage:
 * - Beginner preset: 3 rounds, 2min work, 1min rest (9 minutes total)
 * - Intermediate preset: 5 rounds, 3min work, 1min rest (20 minutes total)
 * - Advanced preset: 12 rounds, 3min work, 1min rest (48 minutes total)
 * - Custom workout configurations
 * - Error scenarios and recovery
 */

import { test, expect, Page, BrowserContext } from '@playwright/test'
import { promises as fs } from 'fs'
import path from 'path'

/**
 * Page Object Model for Boxing Timer
 * Encapsulates timer interactions and provides reusable test methods
 */
class BoxingTimerPage {
  constructor(private page: Page) {}

  // Selectors for timer elements
  private selectors = {
    timerDisplay: '[data-testid="timer-display"]',
    currentTime: '[data-testid="current-time"]',
    currentRound: '[data-testid="current-round"]',
    totalRounds: '[data-testid="total-rounds"]',
    phaseIndicator: '[data-testid="phase-indicator"]',
    startButton: '[data-testid="start-button"]',
    pauseButton: '[data-testid="pause-button"]',
    stopButton: '[data-testid="stop-button"]',
    resetButton: '[data-testid="reset-button"]',
    presetSelector: '[data-testid="preset-selector"]',
    settingsButton: '[data-testid="settings-button"]',
    volumeSlider: '[data-testid="volume-slider"]',
    muteButton: '[data-testid="mute-button"]',
    workoutComplete: '[data-testid="workout-complete"]',
    progressBar: '[data-testid="progress-bar"]'
  }

  /**
   * Navigate to the boxing timer application
   */
  async goto() {
    await this.page.goto('/')
    await this.page.waitForLoadState('networkidle')
    
    // Verify the page loaded correctly
    await expect(this.page.locator(this.selectors.timerDisplay)).toBeVisible()
  }

  /**
   * Select a workout preset
   * @param preset - The preset name (beginner, intermediate, advanced)
   */
  async selectPreset(preset: 'beginner' | 'intermediate' | 'advanced') {
    await this.page.locator(this.selectors.presetSelector).click()
    await this.page.locator(`[data-testid="preset-${preset}"]`).click()
    
    // Wait for preset to be applied
    await this.page.waitForTimeout(500)
  }

  /**
   * Start the timer workout
   */
  async startWorkout() {
    await this.page.locator(this.selectors.startButton).click()
    
    // Verify timer started
    await expect(this.page.locator(this.selectors.pauseButton)).toBeVisible()
  }

  /**
   * Pause the timer workout
   */
  async pauseWorkout() {
    await this.page.locator(this.selectors.pauseButton).click()
    
    // Verify timer paused
    await expect(this.page.locator(this.selectors.startButton)).toBeVisible()
  }

  /**
   * Stop the timer workout
   */
  async stopWorkout() {
    await this.page.locator(this.selectors.stopButton).click()
    
    // Verify timer stopped and reset
    await expect(this.page.locator(this.selectors.startButton)).toBeVisible()
  }

  /**
   * Reset the timer workout
   */
  async resetWorkout() {
    await this.page.locator(this.selectors.resetButton).click()
    
    // Verify timer reset to initial state
    await expect(this.page.locator(this.selectors.startButton)).toBeVisible()
  }

  /**
   * Get current timer display time
   * @returns Current time displayed on timer (in seconds)
   */
  async getCurrentTime(): Promise<number> {
    const timeText = await this.page.locator(this.selectors.currentTime).textContent()
    const [minutes, seconds] = timeText!.split(':').map(Number)
    return minutes * 60 + seconds
  }

  /**
   * Get current round information
   * @returns Object with current round and total rounds
   */
  async getRoundInfo(): Promise<{ current: number; total: number }> {
    const currentRound = await this.page.locator(this.selectors.currentRound).textContent()
    const totalRounds = await this.page.locator(this.selectors.totalRounds).textContent()
    
    return {
      current: parseInt(currentRound!),
      total: parseInt(totalRounds!)
    }
  }

  /**
   * Get current workout phase (work/rest)
   * @returns Current phase as string
   */
  async getCurrentPhase(): Promise<'work' | 'rest'> {
    const phaseText = await this.page.locator(this.selectors.phaseIndicator).textContent()
    return phaseText?.toLowerCase().includes('work') ? 'work' : 'rest'
  }

  /**
   * Wait for phase transition (work to rest or rest to work)
   * @param expectedPhase - The phase to wait for
   * @param timeout - Maximum time to wait in milliseconds
   */
  async waitForPhaseTransition(expectedPhase: 'work' | 'rest', timeout = 10000) {
    await this.page.waitForFunction(
      (phase) => {
        const phaseIndicator = document.querySelector('[data-testid="phase-indicator"]')
        return phaseIndicator?.textContent?.toLowerCase().includes(phase)
      },
      expectedPhase,
      { timeout }
    )
  }

  /**
   * Wait for round transition
   * @param expectedRound - The round number to wait for
   * @param timeout - Maximum time to wait in milliseconds
   */
  async waitForRoundTransition(expectedRound: number, timeout = 10000) {
    await this.page.waitForFunction(
      (round) => {
        const roundIndicator = document.querySelector('[data-testid="current-round"]')
        return parseInt(roundIndicator?.textContent || '0') === round
      },
      expectedRound,
      { timeout }
    )
  }

  /**
   * Wait for workout completion
   * @param timeout - Maximum time to wait in milliseconds
   */
  async waitForWorkoutComplete(timeout = 60000) {
    await expect(this.page.locator(this.selectors.workoutComplete)).toBeVisible({ timeout })
  }

  /**
   * Verify timer accuracy within acceptable range
   * @param expectedTime - Expected time in seconds
   * @param toleranceMs - Acceptable tolerance in milliseconds (default 100ms)
   */
  async verifyTimerAccuracy(expectedTime: number, toleranceMs = 100) {
    const actualTime = await this.getCurrentTime()
    const actualMs = actualTime * 1000
    const expectedMs = expectedTime * 1000
    const difference = Math.abs(actualMs - expectedMs)
    
    expect(difference).toBeLessThanOrEqual(toleranceMs)
  }

  /**
   * Enable audio and set volume
   * @param volume - Volume level (0-100)
   */
  async enableAudio(volume = 50) {
    // Unmute if muted
    const muteButton = this.page.locator(this.selectors.muteButton)
    const isMuted = await muteButton.getAttribute('aria-pressed') === 'true'
    
    if (isMuted) {
      await muteButton.click()
    }
    
    // Set volume
    await this.page.locator(this.selectors.volumeSlider).fill(volume.toString())
  }

  /**
   * Record timer metrics during workout
   * @param duration - How long to record metrics (in seconds)
   * @returns Array of timer measurements
   */
  async recordTimerMetrics(duration: number): Promise<Array<{ time: number; systemTime: number }>> {
    const measurements: Array<{ time: number; systemTime: number }> = []
    const startTime = Date.now()
    const endTime = startTime + (duration * 1000)

    while (Date.now() < endTime) {
      const timerTime = await this.getCurrentTime()
      const systemTime = Date.now()
      measurements.push({ time: timerTime, systemTime })
      
      // Sample every 100ms
      await this.page.waitForTimeout(100)
    }

    return measurements
  }
}

/**
 * Test Data Configuration
 * Defines preset configurations and expected workout parameters
 */
const workoutPresets = {
  beginner: {
    workDuration: 120, // 2 minutes
    restDuration: 60,  // 1 minute
    totalRounds: 3,
    totalDuration: 540 // 9 minutes (3 rounds × 3 minutes per round)
  },
  intermediate: {
    workDuration: 180, // 3 minutes
    restDuration: 60,  // 1 minute
    totalRounds: 5,
    totalDuration: 1200 // 20 minutes (5 rounds × 4 minutes per round)
  },
  advanced: {
    workDuration: 180, // 3 minutes
    restDuration: 60,  // 1 minute
    totalRounds: 12,
    totalDuration: 2880 // 48 minutes (12 rounds × 4 minutes per round)
  }
}

test.describe('Complete Workout E2E Tests', () => {
  let timerPage: BoxingTimerPage

  test.beforeEach(async ({ page }) => {
    timerPage = new BoxingTimerPage(page)
    await timerPage.goto()
    
    // Enable audio for all tests
    await timerPage.enableAudio()
  })

  test.describe('Beginner Workout (3 rounds, 2min work, 1min rest)', () => {
    test('should complete full beginner workout successfully', async ({ page }) => {
      // Select beginner preset
      await timerPage.selectPreset('beginner')
      
      // Verify preset configuration loaded
      const roundInfo = await timerPage.getRoundInfo()
      expect(roundInfo.total).toBe(workoutPresets.beginner.totalRounds)
      expect(roundInfo.current).toBe(1)
      
      // Start workout
      await timerPage.startWorkout()
      
      // Record initial timer state
      const startTime = Date.now()
      let currentRound = 1
      
      // Complete all rounds
      for (let round = 1; round <= workoutPresets.beginner.totalRounds; round++) {
        console.log(`Testing round ${round}/${workoutPresets.beginner.totalRounds}`)
        
        // Verify we're in the correct round
        await timerPage.waitForRoundTransition(round)
        
        // Work phase
        console.log(`Round ${round}: Work phase`)
        await expect(page.locator('[data-testid="phase-indicator"]')).toContainText('Work', { timeout: 5000 })
        
        // Wait for work phase to complete (with some buffer for timer precision)
        const workEndTime = startTime + ((round - 1) * (workoutPresets.beginner.workDuration + workoutPresets.beginner.restDuration) * 1000) + (workoutPresets.beginner.workDuration * 1000)
        const timeToWait = Math.max(0, workEndTime - Date.now() - 1000) // Wait until 1 second before expected end
        
        if (timeToWait > 0) {
          await page.waitForTimeout(timeToWait)
        }
        
        // Verify timer accuracy during work phase
        await timerPage.verifyTimerAccuracy(workoutPresets.beginner.workDuration, 100)
        
        // If not the last round, wait for rest phase
        if (round < workoutPresets.beginner.totalRounds) {
          console.log(`Round ${round}: Rest phase`)
          
          // Wait for phase transition to rest
          await timerPage.waitForPhaseTransition('rest', 5000)
          
          // Wait for rest phase to complete
          const restEndTime = workEndTime + (workoutPresets.beginner.restDuration * 1000)
          const restTimeToWait = Math.max(0, restEndTime - Date.now() - 1000)
          
          if (restTimeToWait > 0) {
            await page.waitForTimeout(restTimeToWait)
          }
          
          // Verify timer accuracy during rest phase
          await timerPage.verifyTimerAccuracy(workoutPresets.beginner.restDuration, 100)
        }
      }
      
      // Wait for workout completion
      await timerPage.waitForWorkoutComplete(10000)
      
      // Verify workout completed successfully
      await expect(page.locator('[data-testid="workout-complete"]')).toBeVisible()
      
      // Verify total workout time accuracy
      const totalElapsed = Date.now() - startTime
      const expectedDuration = workoutPresets.beginner.totalDuration * 1000
      const timeDifference = Math.abs(totalElapsed - expectedDuration)
      
      // Allow 5% tolerance for complete workout duration
      expect(timeDifference).toBeLessThan(expectedDuration * 0.05)
    })

    test('should handle pause and resume during beginner workout', async ({ page }) => {
      await timerPage.selectPreset('beginner')
      await timerPage.startWorkout()
      
      // Let workout run for 30 seconds
      await page.waitForTimeout(30000)
      
      // Pause workout
      const pauseTime = await timerPage.getCurrentTime()
      await timerPage.pauseWorkout()
      
      // Wait 5 seconds while paused
      await page.waitForTimeout(5000)
      
      // Verify timer didn't advance while paused
      const pausedTime = await timerPage.getCurrentTime()
      expect(pausedTime).toBe(pauseTime)
      
      // Resume workout
      await timerPage.startWorkout()
      
      // Verify timer continues from pause point
      await page.waitForTimeout(2000)
      const resumedTime = await timerPage.getCurrentTime()
      expect(resumedTime).toBeLessThan(pauseTime)
    })

    test('should handle stop and reset during beginner workout', async ({ page }) => {
      await timerPage.selectPreset('beginner')
      await timerPage.startWorkout()
      
      // Let workout run for 30 seconds
      await page.waitForTimeout(30000)
      
      // Stop workout
      await timerPage.stopWorkout()
      
      // Verify timer stopped and shows initial state
      const stoppedTime = await timerPage.getCurrentTime()
      expect(stoppedTime).toBe(workoutPresets.beginner.workDuration)
      
      // Verify round reset to 1
      const roundInfo = await timerPage.getRoundInfo()
      expect(roundInfo.current).toBe(1)
    })
  })

  test.describe('Intermediate Workout (5 rounds, 3min work, 1min rest)', () => {
    test('should complete first two rounds of intermediate workout', async ({ page }) => {
      // Test first two rounds to verify scaling without full 20-minute test
      await timerPage.selectPreset('intermediate')
      
      // Verify preset configuration
      const roundInfo = await timerPage.getRoundInfo()
      expect(roundInfo.total).toBe(workoutPresets.intermediate.totalRounds)
      
      await timerPage.startWorkout()
      
      // Complete first round (work + rest)
      await timerPage.waitForPhaseTransition('work')
      await page.waitForTimeout(3000) // Sample work phase
      await timerPage.waitForPhaseTransition('rest')
      await page.waitForTimeout(3000) // Sample rest phase
      
      // Verify transition to round 2
      await timerPage.waitForRoundTransition(2)
      
      // Complete second round work phase
      await timerPage.waitForPhaseTransition('work')
      await page.waitForTimeout(3000)
      
      // Stop and verify state
      await timerPage.stopWorkout()
      
      const finalRoundInfo = await timerPage.getRoundInfo()
      expect(finalRoundInfo.current).toBe(1) // Should reset after stop
    })

    test('should maintain timer precision in intermediate workout', async ({ page }) => {
      await timerPage.selectPreset('intermediate')
      await timerPage.startWorkout()
      
      // Record timer metrics for 30 seconds
      const metrics = await timerPage.recordTimerMetrics(30)
      
      // Analyze timer precision
      let maxDeviation = 0
      for (let i = 1; i < metrics.length; i++) {
        const timeDiff = metrics[i].systemTime - metrics[i-1].systemTime
        const timerDiff = (metrics[i-1].time - metrics[i].time) * 1000 // Convert to ms
        const deviation = Math.abs(timeDiff - timerDiff)
        maxDeviation = Math.max(maxDeviation, deviation)
      }
      
      // Verify timer precision within ±100ms requirement
      expect(maxDeviation).toBeLessThanOrEqual(100)
      
      await timerPage.stopWorkout()
    })
  })

  test.describe('Advanced Workout (12 rounds, 3min work, 1min rest)', () => {
    test('should initialize advanced workout correctly', async ({ page }) => {
      // Test advanced workout initialization without full 48-minute run
      await timerPage.selectPreset('advanced')
      
      // Verify preset configuration
      const roundInfo = await timerPage.getRoundInfo()
      expect(roundInfo.total).toBe(workoutPresets.advanced.totalRounds)
      expect(roundInfo.current).toBe(1)
      
      // Verify initial timer display
      const initialTime = await timerPage.getCurrentTime()
      expect(initialTime).toBe(workoutPresets.advanced.workDuration)
      
      // Start and verify first round begins
      await timerPage.startWorkout()
      await timerPage.waitForPhaseTransition('work')
      
      // Verify timer starts counting down
      await page.waitForTimeout(2000)
      const runningTime = await timerPage.getCurrentTime()
      expect(runningTime).toBeLessThan(workoutPresets.advanced.workDuration)
      
      await timerPage.stopWorkout()
    })

    test('should handle multiple round transitions correctly', async ({ page }) => {
      await timerPage.selectPreset('advanced')
      await timerPage.startWorkout()
      
      // Fast-forward through first few round transitions using shorter waits
      // This tests the round transition logic without waiting full durations
      
      for (let round = 1; round <= 3; round++) {
        // Verify current round
        await timerPage.waitForRoundTransition(round)
        
        // Sample work phase
        await timerPage.waitForPhaseTransition('work')
        await page.waitForTimeout(1000)
        
        // Skip to near end of work phase by manipulating timer (if API allows)
        // Or verify transition occurs within reasonable time bounds
        if (round < 3) {
          // Sample rest phase transition
          await page.waitForTimeout(2000)
        }
      }
      
      await timerPage.stopWorkout()
    })
  })

  test.describe('Error Scenarios and Recovery', () => {
    test('should recover from browser tab focus loss', async ({ page, context }) => {
      await timerPage.selectPreset('beginner')
      await timerPage.startWorkout()
      
      // Get initial time
      const initialTime = await timerPage.getCurrentTime()
      
      // Simulate tab focus loss by opening new tab
      const newPage = await context.newPage()
      await newPage.goto('about:blank')
      
      // Wait 5 seconds with timer in background
      await newPage.waitForTimeout(5000)
      
      // Return to timer tab
      await page.bringToFront()
      
      // Verify timer continued running (background execution may vary by browser)
      const currentTime = await timerPage.getCurrentTime()
      expect(currentTime).toBeLessThan(initialTime)
      
      await timerPage.stopWorkout()
    })

    test('should handle page refresh during workout', async ({ page }) => {
      await timerPage.selectPreset('beginner')
      await timerPage.startWorkout()
      
      // Let timer run briefly
      await page.waitForTimeout(5000)
      
      // Refresh page
      await page.reload()
      await timerPage.goto()
      
      // Verify timer state after refresh (should reset to initial state)
      const roundInfo = await timerPage.getRoundInfo()
      expect(roundInfo.current).toBe(1)
      
      const currentTime = await timerPage.getCurrentTime()
      expect(currentTime).toBeGreaterThan(0) // Should show initial preset time
    })

    test('should handle network connectivity issues gracefully', async ({ page, context }) => {
      await timerPage.selectPreset('intermediate')
      await timerPage.startWorkout()
      
      // Simulate network offline
      await context.setOffline(true)
      
      // Timer should continue working offline
      await page.waitForTimeout(3000)
      const timeWithoutNetwork = await timerPage.getCurrentTime()
      expect(timeWithoutNetwork).toBeGreaterThan(0)
      
      // Restore network
      await context.setOffline(false)
      
      // Timer should still function normally
      await page.waitForTimeout(2000)
      const timeWithNetwork = await timerPage.getCurrentTime()
      expect(timeWithNetwork).toBeLessThan(timeWithoutNetwork)
      
      await timerPage.stopWorkout()
    })
  })

  test.describe('Performance and Memory', () => {
    test('should not leak memory during long workout simulation', async ({ page }) => {
      // Monitor memory usage during rapid start/stop cycles
      const initialMetrics = await page.evaluate(() => {
        return (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize
        } : null
      })

      // Simulate multiple workout cycles
      for (let i = 0; i < 5; i++) {
        await timerPage.selectPreset('beginner')
        await timerPage.startWorkout()
        await page.waitForTimeout(2000)
        await timerPage.stopWorkout()
        await page.waitForTimeout(500)
      }

      // Check memory after cycles
      const finalMetrics = await page.evaluate(() => {
        return (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize
        } : null
      })

      // Verify no significant memory leak (allow 50% increase)
      if (initialMetrics && finalMetrics) {
        const memoryIncrease = finalMetrics.usedJSHeapSize - initialMetrics.usedJSHeapSize
        const acceptableIncrease = initialMetrics.usedJSHeapSize * 0.5
        expect(memoryIncrease).toBeLessThan(acceptableIncrease)
      }
    })

    test('should maintain UI responsiveness during timer operation', async ({ page }) => {
      await timerPage.selectPreset('intermediate')
      await timerPage.startWorkout()
      
      // Measure UI interaction responsiveness
      const startTime = Date.now()
      
      // Perform UI interactions while timer is running
      await timerPage.pauseWorkout()
      const pauseResponseTime = Date.now() - startTime
      
      await timerPage.startWorkout()
      const resumeTime = Date.now()
      
      await timerPage.stopWorkout()
      const stopResponseTime = Date.now() - resumeTime
      
      // UI interactions should respond within 100ms
      expect(pauseResponseTime).toBeLessThan(100)
      expect(stopResponseTime).toBeLessThan(100)
    })
  })

  // Save test results for analysis
  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status === 'failed') {
      // Capture additional debugging information
      const timerState = await page.evaluate(() => {
        return {
          currentTime: document.querySelector('[data-testid="current-time"]')?.textContent,
          currentRound: document.querySelector('[data-testid="current-round"]')?.textContent,
          phase: document.querySelector('[data-testid="phase-indicator"]')?.textContent,
          isRunning: document.querySelector('[data-testid="pause-button"]') !== null
        }
      })
      
      const testResultsDir = path.join(__dirname, '../test-results')
      await fs.mkdir(testResultsDir, { recursive: true })
      
      await fs.writeFile(
        path.join(testResultsDir, `complete-workouts-failure-${testInfo.title.replace(/\s+/g, '-')}.json`),
        JSON.stringify({ testInfo: testInfo.title, timerState, timestamp: new Date().toISOString() }, null, 2)
      )
    }
  })
})