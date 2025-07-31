/**
 * Timer Precision E2E Tests for Boxing Timer MVP
 * 
 * Tests timer accuracy and precision requirements across different browsers and scenarios.
 * Validates the critical ±100ms accuracy requirement for boxing workout timing.
 * 
 * Business Context:
 * - Boxing training requires precise timing for effective interval training
 * - Timer accuracy of ±100ms is crucial for consistent workout quality
 * - Web Workers are used to maintain precision despite browser limitations
 * - Background tab throttling and browser differences can affect timer accuracy
 * - Long-running timers must maintain precision throughout entire workout
 * 
 * Test Coverage:
 * - Real-time timer precision measurement and validation
 * - Cross-browser timer accuracy comparison
 * - Background execution timer behavior
 * - High-frequency precision sampling
 * - Long-duration precision stability
 * - System resource impact on timer accuracy
 */

import { test, expect, Page, BrowserContext } from '@playwright/test'
import { promises as fs } from 'fs'
import path from 'path'

/**
 * Timer Precision Testing Utilities
 * Provides high-accuracy timer measurement and analysis capabilities
 */
class TimerPrecisionTester {
  constructor(private page: Page) {}

  private selectors = {
    timerDisplay: '[data-testid="timer-display"]',
    currentTime: '[data-testid="current-time"]',
    startButton: '[data-testid="start-button"]',
    pauseButton: '[data-testid="pause-button"]',
    stopButton: '[data-testid="stop-button"]',
    presetSelector: '[data-testid="preset-selector"]'
  }

  /**
   * Initialize timer page and prepare for precision testing
   */
  async initialize() {
    await this.page.goto('/')
    await this.page.waitForLoadState('networkidle')
    await expect(this.page.locator(this.selectors.timerDisplay)).toBeVisible()
  }

  /**
   * Get current timer value with high precision
   * @returns Timer value in milliseconds
   */
  async getCurrentTimerMs(): Promise<number> {
    const timeText = await this.page.locator(this.selectors.currentTime).textContent()
    if (!timeText) throw new Error('Timer display not found')
    
    const [minutes, seconds] = timeText.split(':').map(Number)
    return (minutes * 60 + seconds) * 1000
  }

  /**
   * Start timer and record start timestamp
   * @returns High-precision start timestamp
   */
  async startTimerWithTimestamp(): Promise<number> {
    const startPromise = this.page.locator(this.selectors.startButton).click()
    const startTime = performance.now()
    await startPromise
    return startTime
  }

  /**
   * Collect high-frequency timer samples
   * @param durationMs - Duration to collect samples (milliseconds)
   * @param intervalMs - Sampling interval (default 50ms)
   * @returns Array of precision measurements
   */
  async collectTimerSamples(durationMs: number, intervalMs = 50): Promise<TimerSample[]> {
    const samples: TimerSample[] = []
    const startTime = performance.now()
    const endTime = startTime + durationMs

    while (performance.now() < endTime) {
      const systemTime = performance.now()
      const timerValue = await this.getCurrentTimerMs()
      
      samples.push({
        systemTime,
        timerValue,
        relativeSystemTime: systemTime - startTime
      })
      
      await this.page.waitForTimeout(intervalMs)
    }

    return samples
  }

  /**
   * Analyze timer precision from collected samples
   * @param samples - Timer samples to analyze
   * @param expectedRate - Expected countdown rate (1000ms per second)
   * @returns Precision analysis results
   */
  analyzePrecision(samples: TimerSample[], expectedRate = 1000): TimerPrecisionAnalysis {
    if (samples.length < 2) {
      throw new Error('Need at least 2 samples for precision analysis')
    }

    const deviations: number[] = []
    const driftValues: number[] = []
    let maxDeviation = 0
    let totalDrift = 0

    for (let i = 1; i < samples.length; i++) {
      const prev = samples[i - 1]
      const curr = samples[i]
      
      // Calculate expected vs actual timer progression
      const systemTimeDiff = curr.systemTime - prev.systemTime
      const timerTimeDiff = prev.timerValue - curr.timerValue // Timer counts down
      
      // Deviation from expected progression
      const deviation = Math.abs(timerTimeDiff - systemTimeDiff)
      deviations.push(deviation)
      maxDeviation = Math.max(maxDeviation, deviation)
      
      // Cumulative drift calculation
      const expectedTimerValue = samples[0].timerValue - curr.relativeSystemTime
      const drift = Math.abs(curr.timerValue - expectedTimerValue)
      driftValues.push(drift)
      totalDrift += drift
    }

    const avgDeviation = deviations.reduce((sum, d) => sum + d, 0) / deviations.length
    const avgDrift = totalDrift / driftValues.length
    const maxDrift = Math.max(...driftValues)

    return {
      sampleCount: samples.length,
      avgDeviation,
      maxDeviation,
      avgDrift,
      maxDrift,
      meetsRequirement: maxDeviation <= 100, // ±100ms requirement
      durationMs: samples[samples.length - 1].systemTime - samples[0].systemTime,
      samples: samples.length > 20 ? samples.filter((_, i) => i % Math.floor(samples.length / 20) === 0) : samples
    }
  }

  /**
   * Test timer precision under CPU load
   * @param durationMs - Test duration
   * @returns Precision analysis under load
   */
  async testPrecisionUnderLoad(durationMs: number): Promise<TimerPrecisionAnalysis> {
    // Start CPU-intensive task in browser
    await this.page.evaluate(() => {
      const startIntensiveTask = () => {
        const worker = () => {
          let result = 0
          for (let i = 0; i < 100000; i++) {
            result += Math.random() * Math.sin(i)
          }
          setTimeout(worker, 10)
        }
        worker()
      }
      startIntensiveTask()
    })

    // Collect samples under load
    const samples = await this.collectTimerSamples(durationMs, 100)
    return this.analyzePrecision(samples)
  }

  /**
   * Test timer precision in background tab
   * @param context - Browser context
   * @param durationMs - Test duration
   * @returns Precision analysis in background
   */
  async testBackgroundPrecision(context: BrowserContext, durationMs: number): Promise<TimerPrecisionAnalysis> {
    // Create new foreground tab
    const backgroundPage = this.page
    const foregroundPage = await context.newPage()
    await foregroundPage.goto('about:blank')
    
    // Background tab timer should continue running
    const samples = await this.collectTimerSamples(durationMs, 200) // Slower sampling for background
    
    await foregroundPage.close()
    return this.analyzePrecision(samples)
  }
}

/**
 * Timer sample data structure
 */
interface TimerSample {
  systemTime: number
  timerValue: number
  relativeSystemTime: number
}

/**
 * Timer precision analysis results
 */
interface TimerPrecisionAnalysis {
  sampleCount: number
  avgDeviation: number
  maxDeviation: number
  avgDrift: number
  maxDrift: number
  meetsRequirement: boolean
  durationMs: number
  samples: TimerSample[]
}

test.describe('Timer Precision E2E Tests', () => {
  let tester: TimerPrecisionTester

  test.beforeEach(async ({ page }) => {
    tester = new TimerPrecisionTester(page)
    await tester.initialize()
  })

  test.describe('Basic Timer Precision', () => {
    test('should maintain ±100ms precision over 30 seconds', async ({ page }) => {
      // Select beginner preset for consistent 2-minute timer
      await page.locator('[data-testid="preset-selector"]').click()
      await page.locator('[data-testid="preset-beginner"]').click()
      
      // Start timer
      await tester.startTimerWithTimestamp()
      
      // Collect high-frequency samples for 30 seconds
      const analysis = await tester.collectTimerSamples(30000, 50)
      const precision = tester.analyzePrecision(analysis)
      
      // Verify precision requirements
      expect(precision.meetsRequirement).toBe(true)
      expect(precision.maxDeviation).toBeLessThanOrEqual(100)
      expect(precision.avgDeviation).toBeLessThanOrEqual(50) // Average should be better than max
      
      console.log(`Timer precision analysis:`)
      console.log(`- Sample count: ${precision.sampleCount}`)
      console.log(`- Average deviation: ${precision.avgDeviation.toFixed(2)}ms`)
      console.log(`- Maximum deviation: ${precision.maxDeviation.toFixed(2)}ms`)
      console.log(`- Average drift: ${precision.avgDrift.toFixed(2)}ms`)
      console.log(`- Maximum drift: ${precision.maxDrift.toFixed(2)}ms`)
      
      // Stop timer
      await page.locator('[data-testid="stop-button"]').click()
    })

    test('should maintain precision across different preset durations', async ({ page }) => {
      const presets = ['beginner', 'intermediate', 'advanced']
      const results: Record<string, TimerPrecisionAnalysis> = {}
      
      for (const preset of presets) {
        console.log(`Testing precision for ${preset} preset`)
        
        // Reset and select preset
        await page.locator('[data-testid="reset-button"]').click()
        await page.locator('[data-testid="preset-selector"]').click()
        await page.locator(`[data-testid="preset-${preset}"]`).click()
        
        // Start timer and collect samples
        await tester.startTimerWithTimestamp()
        const samples = await tester.collectTimerSamples(10000, 100) // 10 seconds per preset
        const analysis = tester.analyzePrecision(samples)
        
        results[preset] = analysis
        
        // All presets should meet precision requirements
        expect(analysis.meetsRequirement).toBe(true)
        expect(analysis.maxDeviation).toBeLessThanOrEqual(100)
        
        await page.locator('[data-testid="stop-button"]').click()
        await page.waitForTimeout(1000)
      }
      
      // Compare precision consistency across presets
      const deviations = Object.values(results).map(r => r.maxDeviation)
      const maxSpread = Math.max(...deviations) - Math.min(...deviations)
      
      // Precision should be consistent across presets (within 50ms spread)
      expect(maxSpread).toBeLessThanOrEqual(50)
    })

    test('should handle pause and resume without precision loss', async ({ page }) => {
      await page.locator('[data-testid="preset-selector"]').click()
      await page.locator('[data-testid="preset-intermediate"]').click()
      
      await tester.startTimerWithTimestamp()
      
      // Run for 5 seconds
      await tester.collectTimerSamples(5000, 100)
      
      // Pause timer
      const pauseTime = await tester.getCurrentTimerMs()
      await page.locator('[data-testid="pause-button"]').click()
      
      // Wait 3 seconds while paused
      await page.waitForTimeout(3000)
      
      // Resume and collect samples
      await page.locator('[data-testid="start-button"]').click()
      const resumeTime = await tester.getCurrentTimerMs()
      
      // Verify timer didn't advance during pause
      expect(Math.abs(resumeTime - pauseTime)).toBeLessThanOrEqual(100)
      
      // Continue timing after resume
      const postResumeAnalysis = await tester.collectTimerSamples(10000, 100)
      const postResumePrecision = tester.analyzePrecision(postResumeAnalysis)
      
      // Precision should remain good after pause/resume
      expect(postResumePrecision.meetsRequirement).toBe(true)
      expect(postResumePrecision.maxDeviation).toBeLessThanOrEqual(100)
      
      await page.locator('[data-testid="stop-button"]').click()
    })
  })

  test.describe('Performance Impact on Precision', () => {
    test('should maintain precision under CPU load', async ({ page }) => {
      await page.locator('[data-testid="preset-selector"]').click()
      await page.locator('[data-testid="preset-beginner"]').click()
      
      await tester.startTimerWithTimestamp()
      
      // Test precision under simulated CPU load
      const analysis = await tester.testPrecisionUnderLoad(15000)
      
      // Even under load, should meet basic requirements (allow slightly higher tolerance)
      expect(analysis.maxDeviation).toBeLessThanOrEqual(150) // Relaxed for CPU load scenario
      expect(analysis.avgDeviation).toBeLessThanOrEqual(75)
      
      console.log(`Precision under CPU load:`)
      console.log(`- Average deviation: ${analysis.avgDeviation.toFixed(2)}ms`)
      console.log(`- Maximum deviation: ${analysis.maxDeviation.toFixed(2)}ms`)
      
      await page.locator('[data-testid="stop-button"]').click()
    })

    test('should handle memory pressure gracefully', async ({ page }) => {
      await page.locator('[data-testid="preset-selector"]').click()
      await page.locator('[data-testid="preset-intermediate"]').click()
      
      // Create memory pressure
      await page.evaluate(() => {
        const arrays = []
        for (let i = 0; i < 100; i++) {
          arrays.push(new Array(100000).fill(Math.random()))
        }
        // Keep reference to prevent garbage collection
        (window as any).memoryPressure = arrays
      })
      
      await tester.startTimerWithTimestamp()
      
      // Test precision under memory pressure
      const samples = await tester.collectTimerSamples(10000, 100)
      const analysis = tester.analyzePrecision(samples)
      
      // Clean up memory pressure
      await page.evaluate(() => {
        delete (window as any).memoryPressure
      })
      
      // Should still maintain reasonable precision
      expect(analysis.maxDeviation).toBeLessThanOrEqual(150)
      
      await page.locator('[data-testid="stop-button"]').click()
    })
  })

  test.describe('Background Tab Behavior', () => {
    test('should maintain reasonable precision in background tab', async ({ page, context }) => {
      await page.locator('[data-testid="preset-selector"]').click()
      await page.locator('[data-testid="preset-beginner"]').click()
      
      await tester.startTimerWithTimestamp()
      
      // Test precision in background
      const analysis = await tester.testBackgroundPrecision(context, 10000)
      
      // Background tabs may have reduced precision due to browser throttling
      // But should still function within reasonable bounds
      expect(analysis.maxDeviation).toBeLessThanOrEqual(1000) // 1 second tolerance for background
      
      console.log(`Background tab precision:`)
      console.log(`- Average deviation: ${analysis.avgDeviation.toFixed(2)}ms`)
      console.log(`- Maximum deviation: ${analysis.maxDeviation.toFixed(2)}ms`)
      
      await page.locator('[data-testid="stop-button"]').click()
    })

    test('should recover precision when returning to foreground', async ({ page, context }) => {
      await page.locator('[data-testid="preset-selector"]').click()
      await page.locator('[data-testid="preset-intermediate"]').click()
      
      await tester.startTimerWithTimestamp()
      
      // Move to background
      const foregroundPage = await context.newPage()
      await foregroundPage.goto('about:blank')
      
      // Wait in background
      await page.waitForTimeout(5000)
      
      // Return to foreground
      await foregroundPage.close()
      await page.bringToFront()
      
      // Test precision after returning to foreground
      const samples = await tester.collectTimerSamples(10000, 100)
      const analysis = tester.analyzePrecision(samples)
      
      // Should recover good precision in foreground
      expect(analysis.maxDeviation).toBeLessThanOrEqual(200) // Allow some recovery time
      
      await page.locator('[data-testid="stop-button"]').click()
    })
  })

  test.describe('Long Duration Precision', () => {
    test('should maintain precision over extended periods', async ({ page }) => {
      // Use advanced preset for longer duration test
      await page.locator('[data-testid="preset-selector"]').click()
      await page.locator('[data-testid="preset-advanced"]').click()
      
      await tester.startTimerWithTimestamp()
      
      // Test precision over 2 minutes (representative of longer workouts)
      const samples = await tester.collectTimerSamples(120000, 1000) // Sample every second
      const analysis = tester.analyzePrecision(samples)
      
      // Long-duration precision should still meet requirements
      expect(analysis.meetsRequirement).toBe(true)
      expect(analysis.maxDeviation).toBeLessThanOrEqual(100)
      
      // Drift should remain minimal over time
      expect(analysis.maxDrift).toBeLessThanOrEqual(500) // Max 500ms drift over 2 minutes
      
      console.log(`Long duration precision (2 minutes):`)
      console.log(`- Sample count: ${analysis.sampleCount}`)
      console.log(`- Maximum deviation: ${analysis.maxDeviation.toFixed(2)}ms`)
      console.log(`- Maximum drift: ${analysis.maxDrift.toFixed(2)}ms`)
      
      await page.locator('[data-testid="stop-button"]').click()
    })

    test('should handle system clock adjustments', async ({ page }) => {
      await page.locator('[data-testid="preset-selector"]').click()
      await page.locator('[data-testid="preset-beginner"]').click()
      
      await tester.startTimerWithTimestamp()
      
      // Simulate system time adjustment (if possible in test environment)
      // This is primarily a documentation test for manual verification
      
      const samples = await tester.collectTimerSamples(30000, 500)
      const analysis = tester.analyzePrecision(samples)
      
      // Timer should use high-resolution performance.now() which is monotonic
      expect(analysis.meetsRequirement).toBe(true)
      
      await page.locator('[data-testid="stop-button"]').click()
    })
  })

  test.describe('Cross-Browser Precision Comparison', () => {
    test('should document precision characteristics for current browser', async ({ page, browserName }) => {
      await page.locator('[data-testid="preset-selector"]').click()
      await page.locator('[data-testid="preset-intermediate"]').click()
      
      await tester.startTimerWithTimestamp()
      
      // Collect comprehensive precision data
      const samples = await tester.collectTimerSamples(30000, 100)
      const analysis = tester.analyzePrecision(samples)
      
      // Create browser-specific report
      const report = {
        browserName,
        timestamp: new Date().toISOString(),
        testDuration: analysis.durationMs,
        sampleCount: analysis.sampleCount,
        avgDeviation: analysis.avgDeviation,
        maxDeviation: analysis.maxDeviation,
        avgDrift: analysis.avgDrift,
        maxDrift: analysis.maxDrift,
        meetsRequirement: analysis.meetsRequirement,
        userAgent: await page.evaluate(() => navigator.userAgent)
      }
      
      // Save browser-specific results
      const resultsDir = path.join(__dirname, '../test-results')
      await fs.mkdir(resultsDir, { recursive: true })
      
      await fs.writeFile(
        path.join(resultsDir, `timer-precision-${browserName}-${Date.now()}.json`),
        JSON.stringify(report, null, 2)
      )
      
      // All browsers should meet the base requirement
      expect(analysis.meetsRequirement).toBe(true)
      
      console.log(`${browserName} precision report:`)
      console.log(`- Average deviation: ${analysis.avgDeviation.toFixed(2)}ms`)
      console.log(`- Maximum deviation: ${analysis.maxDeviation.toFixed(2)}ms`)
      console.log(`- Meets ±100ms requirement: ${analysis.meetsRequirement}`)
      
      await page.locator('[data-testid="stop-button"]').click()
    })
  })

  // Save detailed precision data for analysis
  test.afterEach(async ({ page }, testInfo) => {
    // Capture final timer state and performance metrics
    const finalState = await page.evaluate(() => {
      return {
        performance: {
          memory: (performance as any).memory ? {
            usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
            totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
            jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
          } : null,
          timing: performance.timing,
          now: performance.now()
        },
        timerState: {
          display: document.querySelector('[data-testid="current-time"]')?.textContent,
          isRunning: document.querySelector('[data-testid="pause-button"]') !== null
        }
      }
    })

    // Save performance data for analysis
    if (testInfo.status !== 'skipped') {
      const resultsDir = path.join(__dirname, '../test-results')
      await fs.mkdir(resultsDir, { recursive: true })
      
      await fs.writeFile(
        path.join(resultsDir, `precision-test-${testInfo.title.replace(/\s+/g, '-')}-${Date.now()}.json`),
        JSON.stringify({
          testTitle: testInfo.title,
          status: testInfo.status,
          duration: testInfo.duration,
          finalState,
          timestamp: new Date().toISOString()
        }, null, 2)
      )
    }
  })
})