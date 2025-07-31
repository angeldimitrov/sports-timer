/**
 * Cross-Browser Timer Precision Integration Tests
 * 
 * Comprehensive integration test suite validating ±100ms precision requirement
 * across multiple browser engines and versions:
 * - Chrome 90+ (Blink engine)
 * - Firefox 88+ (Gecko engine)  
 * - Safari 14+ (WebKit engine)
 * - Edge (Chromium-based)
 * - Mobile browsers and WebView components
 * - Different JavaScript engine optimizations and timing mechanisms
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useTimer } from '../../src/hooks/use-timer'
import { TimerConfig, TimerState } from '../../src/lib/timer-engine'

// Mock different browser timing implementations
interface BrowserTimingMock {
  name: string
  userAgent: string
  performanceNowImpl: () => number
  setTimeoutImpl: (callback: Function, delay: number) => NodeJS.Timeout
  dateNowImpl: () => number
  requestAnimationFrameImpl?: (callback: FrameRequestCallback) => number
  highResTimeSupport: boolean
  webWorkerSupport: boolean
}

// Browser-specific timing implementations
const browserMocks: BrowserTimingMock[] = [
  {
    name: 'Chrome 90',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/90.0.4430.212',
    performanceNowImpl: () => {
      // Chrome has high-resolution timing with microsecond precision
      const baseTime = Date.now()
      return baseTime + (Math.random() * 0.1) // Add small variance
    },
    setTimeoutImpl: (callback: Function, delay: number) => {
      // Chrome setTimeout has ~4ms minimum delay
      const actualDelay = Math.max(delay, 4)
      return setTimeout(callback, actualDelay + Math.random() * 2 - 1)
    },
    dateNowImpl: () => Date.now(),
    highResTimeSupport: true,
    webWorkerSupport: true
  },
  {
    name: 'Firefox 88',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:88.0) Firefox/88.0',
    performanceNowImpl: () => {
      // Firefox has good precision but with some variance
      const baseTime = Date.now()
      return baseTime + (Math.random() * 0.5 - 0.25)
    },
    setTimeoutImpl: (callback: Function, delay: number) => {
      // Firefox setTimeout is generally accurate
      return setTimeout(callback, delay + Math.random() * 1 - 0.5)
    },
    dateNowImpl: () => Date.now(),
    highResTimeSupport: true,
    webWorkerSupport: true
  },
  {
    name: 'Safari 14',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/14.1.1',
    performanceNowImpl: () => {
      // Safari has privacy-focused timing with reduced precision
      const baseTime = Date.now()
      // Simulate 100µs precision (Safari's timing precision)
      return Math.floor(baseTime * 10) / 10
    },
    setTimeoutImpl: (callback: Function, delay: number) => {
      // Safari may have slightly less accurate setTimeout
      return setTimeout(callback, delay + Math.random() * 3 - 1.5)
    },
    dateNowImpl: () => {
      // Safari may reduce Date.now() precision for privacy
      return Math.floor(Date.now() / 10) * 10
    },
    highResTimeSupport: true,
    webWorkerSupport: true
  },
  {
    name: 'Edge Chromium',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/91.0.864.59',
    performanceNowImpl: () => {
      // Edge based on Chromium, similar to Chrome
      const baseTime = Date.now()
      return baseTime + (Math.random() * 0.1)
    },
    setTimeoutImpl: (callback: Function, delay: number) => {
      const actualDelay = Math.max(delay, 4)
      return setTimeout(callback, actualDelay + Math.random() * 1.5 - 0.75)
    },
    dateNowImpl: () => Date.now(),
    highResTimeSupport: true,
    webWorkerSupport: true
  },
  {
    name: 'Mobile Chrome Android',
    userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G975F) Chrome/91.0.4472.120 Mobile',
    performanceNowImpl: () => {
      // Mobile Chrome may have slightly reduced precision due to power optimization
      const baseTime = Date.now()
      return baseTime + (Math.random() * 0.5 - 0.25)
    },
    setTimeoutImpl: (callback: Function, delay: number) => {
      // Mobile may have power-saving optimizations affecting timing
      const powerSavingVariance = Math.random() * 5 - 2.5
      return setTimeout(callback, delay + powerSavingVariance)
    },
    dateNowImpl: () => Date.now(),
    highResTimeSupport: true,
    webWorkerSupport: true
  },
  {
    name: 'Mobile Safari iOS',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) Safari/14.1.1',
    performanceNowImpl: () => {
      // iOS Safari has more aggressive timing restrictions
      const baseTime = Date.now()
      // Simulate 1ms precision (iOS Safari restriction)
      return Math.floor(baseTime)
    },
    setTimeoutImpl: (callback: Function, delay: number) => {
      // iOS may throttle timers more aggressively
      const throttleVariance = Math.random() * 10 - 5
      return setTimeout(callback, delay + throttleVariance)
    },
    dateNowImpl: () => {
      // iOS reduces Date.now() precision
      return Math.floor(Date.now() / 100) * 100
    },
    highResTimeSupport: false, // Limited in iOS
    webWorkerSupport: true
  }
]

describe('Cross-Browser Timer Precision Integration Tests', () => {
  let originalPerformanceNow: typeof performance.now
  let originalSetTimeout: typeof setTimeout
  let originalDateNow: typeof Date.now
  let originalUserAgent: string

  const testConfig: TimerConfig = {
    workDuration: 10, // 10 seconds for faster testing
    restDuration: 5,  // 5 seconds for faster testing
    totalRounds: 2,
    enableWarning: true
  }

  beforeEach(() => {
    // Store original implementations
    originalPerformanceNow = performance.now
    originalSetTimeout = setTimeout
    originalDateNow = Date.now
    originalUserAgent = navigator.userAgent
  })

  afterEach(() => {
    // Restore original implementations
    global.performance.now = originalPerformanceNow
    global.setTimeout = originalSetTimeout
    global.Date.now = originalDateNow
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      writable: true
    })
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  /**
   * Test timer precision across all supported browsers
   * Business Rule: Timer must maintain ±100ms accuracy across all browser engines
   */
  describe('Precision Across Browser Engines', () => {
    browserMocks.forEach(browserMock => {
      test(`should maintain ±100ms precision in ${browserMock.name}`, async () => {
        // Mock browser environment
        global.performance.now = browserMock.performanceNowImpl
        global.setTimeout = browserMock.setTimeoutImpl as any
        global.Date.now = browserMock.dateNowImpl
        Object.defineProperty(navigator, 'userAgent', {
          value: browserMock.userAgent,
          writable: true
        })

        jest.useFakeTimers()
        
        const timerEvents: Array<{ timestamp: number; state: TimerState }> = []
        
        const { result } = renderHook(() => 
          useTimer({
            config: testConfig,
            onEvent: (event) => {
              if (event.type === 'tick') {
                timerEvents.push({
                  timestamp: performance.now(),
                  state: event.state
                })
              }
            }
          })
        )

        // Start timer
        act(() => {
          result.current.start()
        })

        // Record timer state at 1-second intervals
        const precisionTests: Array<{
          expectedElapsed: number
          actualElapsed: number
          precision: number
        }> = []

        for (let second = 1; second <= 10; second++) {
          // Advance time by 1 second
          jest.advanceTimersByTime(1000)
          
          const state = result.current.state
          const expectedElapsed = second * 1000
          const actualElapsed = state.timeElapsed
          const precision = Math.abs(expectedElapsed - actualElapsed)
          
          precisionTests.push({
            expectedElapsed,
            actualElapsed,
            precision
          })

          // Critical requirement: ±100ms precision
          expect(precision).toBeLessThanOrEqual(100)
        }

        // Analyze overall precision statistics
        const averagePrecision = precisionTests.reduce((sum, test) => sum + test.precision, 0) / precisionTests.length
        const maxPrecision = Math.max(...precisionTests.map(test => test.precision))
        
        // Statistical validation
        expect(averagePrecision).toBeLessThan(50) // Average should be well under limit
        expect(maxPrecision).toBeLessThanOrEqual(100) // Maximum error should not exceed requirement
        
        // Log precision statistics for analysis
        console.log(`${browserMock.name} Precision Stats:`, {
          average: averagePrecision.toFixed(2) + 'ms',
          maximum: maxPrecision.toFixed(2) + 'ms',
          tests: precisionTests.length
        })
      })
    })
  })

  /**
   * Test precision under browser-specific stress conditions
   * Business Rule: Precision should be maintained even under adverse conditions
   */
  describe('Precision Under Stress Conditions', () => {
    test('should maintain precision with high CPU load simulation', async () => {
      // Simulate high CPU load with Chrome timing
      const chromeMock = browserMocks.find(mock => mock.name === 'Chrome 90')!
      
      global.performance.now = () => {
        // Simulate CPU load affecting timing
        const baseTime = chromeMock.performanceNowImpl()
        const cpuLoadVariance = Math.random() * 20 - 10 // ±10ms variance
        return baseTime + cpuLoadVariance
      }

      jest.useFakeTimers()

      const { result } = renderHook(() => useTimer({ config: testConfig }))

      act(() => {
        result.current.start()
      })

      // Test over shorter duration due to simulated load
      for (let second = 1; second <= 5; second++) {
        jest.advanceTimersByTime(1000)
        
        const state = result.current.state
        const expectedElapsed = second * 1000
        const actualElapsed = state.timeElapsed
        const precision = Math.abs(expectedElapsed - actualElapsed)
        
        // Should still maintain precision under load
        expect(precision).toBeLessThanOrEqual(100)
      }
    })

    test('should maintain precision with background throttling', async () => {
      // Simulate background tab throttling (common in Chrome/Safari)
      const safariMock = browserMocks.find(mock => mock.name === 'Safari 14')!
      
      global.setTimeout = (callback: Function, delay: number) => {
        // Simulate background tab throttling (1 second minimum)
        const throttledDelay = Math.max(delay, 1000)
        return safariMock.setTimeoutImpl(callback, throttledDelay)
      }

      jest.useFakeTimers()

      const { result } = renderHook(() => useTimer({ config: testConfig }))

      act(() => {
        result.current.start()
      })

      // Simulate tab going to background after 3 seconds
      jest.advanceTimersByTime(3000)
      
      // Continue testing with throttling
      for (let second = 4; second <= 6; second++) {
        jest.advanceTimersByTime(1000)
        
        const state = result.current.state
        const expectedElapsed = second * 1000
        const actualElapsed = state.timeElapsed
        const precision = Math.abs(expectedElapsed - actualElapsed)
        
        // Precision should be maintained despite throttling
        expect(precision).toBeLessThanOrEqual(100)
      }
    })

    test('should maintain precision with limited high-res timing', async () => {
      // Simulate browser with limited high-resolution timing (older Safari)
      global.performance.now = () => {
        // Simulate reduced precision (1ms resolution)
        return Math.floor(Date.now())
      }

      jest.useFakeTimers()

      const { result } = renderHook(() => useTimer({ config: testConfig }))

      act(() => {
        result.current.start()
      })

      for (let second = 1; second <= 8; second++) {
        jest.advanceTimersByTime(1000)
        
        const state = result.current.state
        const expectedElapsed = second * 1000
        const actualElapsed = state.timeElapsed
        const precision = Math.abs(expectedElapsed - actualElapsed)
        
        // Should compensate for reduced timing precision
        expect(precision).toBeLessThanOrEqual(100)
      }
    })
  })

  /**
   * Test precision with different update frequencies
   * Business Rule: Timer precision should not depend on display update frequency
   */
  describe('Precision with Different Update Frequencies', () => {
    test('should maintain precision with 60fps updates', async () => {
      jest.useFakeTimers()
      
      // Mock 60fps requestAnimationFrame
      const mockRAF = jest.fn((callback: FrameRequestCallback) => {
        setTimeout(() => callback(performance.now()), 16.67) // ~60fps
        return 1
      })
      global.requestAnimationFrame = mockRAF

      const { result } = renderHook(() => useTimer({ config: testConfig }))

      act(() => {
        result.current.start()
      })

      for (let second = 1; second <= 5; second++) {
        jest.advanceTimersByTime(1000)
        
        const precision = Math.abs((second * 1000) - result.current.state.timeElapsed)
        expect(precision).toBeLessThanOrEqual(100)
      }
    })

    test('should maintain precision with 30fps updates', async () => {
      jest.useFakeTimers()
      
      // Mock 30fps requestAnimationFrame (power saving mode)
      const mockRAF = jest.fn((callback: FrameRequestCallback) => {
        setTimeout(() => callback(performance.now()), 33.33) // ~30fps
        return 1
      })
      global.requestAnimationFrame = mockRAF

      const { result } = renderHook(() => useTimer({ config: testConfig }))

      act(() => {
        result.current.start()
      })

      for (let second = 1; second <= 5; second++) {
        jest.advanceTimersByTime(1000)
        
        const precision = Math.abs((second * 1000) - result.current.state.timeElapsed)
        expect(precision).toBeLessThanOrEqual(100)
      }
    })

    test('should maintain precision with irregular update timing', async () => {
      jest.useFakeTimers()
      
      // Mock irregular requestAnimationFrame (simulating dropped frames)
      let frameCount = 0
      const mockRAF = jest.fn((callback: FrameRequestCallback) => {
        frameCount++
        // Simulate occasional dropped frames
        const delay = frameCount % 4 === 0 ? 50 : 16.67 // Drop every 4th frame
        setTimeout(() => callback(performance.now()), delay)
        return frameCount
      })
      global.requestAnimationFrame = mockRAF

      const { result } = renderHook(() => useTimer({ config: testConfig }))

      act(() => {
        result.current.start()
      })

      for (let second = 1; second <= 5; second++) {
        jest.advanceTimersByTime(1000)
        
        const precision = Math.abs((second * 1000) - result.current.state.timeElapsed)
        expect(precision).toBeLessThanOrEqual(100)
      }
    })
  })

  /**
   * Test long-running timer precision
   * Business Rule: Precision should not degrade over extended periods
   */
  describe('Long-Running Timer Precision', () => {
    test('should maintain precision over 15-minute workout', async () => {
      jest.useFakeTimers()

      const longConfig: TimerConfig = {
        workDuration: 180, // 3 minutes
        restDuration: 60,  // 1 minute  
        totalRounds: 4,    // 16 minute total
        enableWarning: true
      }

      const { result } = renderHook(() => useTimer({ config: longConfig }))

      act(() => {
        result.current.start()
      })

      // Test precision at 2-minute intervals
      const testPoints = [2, 4, 6, 8, 10, 12, 14] // minutes
      
      for (const minutes of testPoints) {
        jest.advanceTimersByTime(minutes * 60 * 1000)
        
        const expectedElapsed = minutes * 60 * 1000
        const actualElapsed = result.current.state.timeElapsed
        const precision = Math.abs(expectedElapsed - actualElapsed)
        
        // Precision should not degrade over time
        expect(precision).toBeLessThanOrEqual(100)
        
        // Log precision for long-running analysis
        console.log(`${minutes}min mark: ${precision.toFixed(2)}ms precision`)
      }
    })

    test('should handle timer drift correction', async () => {
      jest.useFakeTimers()

      // Simulate systematic drift in setTimeout
      let driftAccumulation = 0
      const originalSetTimeout = setTimeout
      global.setTimeout = (callback: Function, delay: number) => {
        driftAccumulation += 2 // 2ms drift per call
        return originalSetTimeout(callback, delay + driftAccumulation)
      } as any

      const { result } = renderHook(() => useTimer({ config: testConfig }))

      act(() => {
        result.current.start()
      })

      // Test drift correction over 10 seconds
      for (let second = 1; second <= 10; second++) {
        jest.advanceTimersByTime(1000)
        
        const expectedElapsed = second * 1000
        const actualElapsed = result.current.state.timeElapsed
        const precision = Math.abs(expectedElapsed - actualElapsed)
        
        // Timer should correct for systematic drift
        expect(precision).toBeLessThanOrEqual(100)
      }
    })
  })

  /**
   * Test precision in different execution contexts
   * Business Rule: Timer should work consistently across different JavaScript contexts
   */
  describe('Precision in Different Execution Contexts', () => {
    test('should maintain precision in Web Worker context', async () => {
      // Mock Web Worker environment timing
      const workerMock = {
        performance: {
          now: () => Date.now() + Math.random() * 0.1
        },
        setTimeout: (callback: Function, delay: number) => {
          // Web Worker setTimeout is generally more accurate
          return setTimeout(callback, delay + Math.random() * 0.5 - 0.25)
        }
      }

      // Apply Web Worker timing characteristics
      global.performance.now = workerMock.performance.now
      global.setTimeout = workerMock.setTimeout as any

      jest.useFakeTimers()

      const { result } = renderHook(() => useTimer({ config: testConfig }))

      act(() => {
        result.current.start()
      })

      for (let second = 1; second <= 8; second++) {
        jest.advanceTimersByTime(1000)
        
        const precision = Math.abs((second * 1000) - result.current.state.timeElapsed)
        expect(precision).toBeLessThanOrEqual(100)
      }
    })

    test('should maintain precision with Service Worker interference', async () => {
      // Simulate Service Worker intercepting timing
      jest.useFakeTimers()

      const { result } = renderHook(() => useTimer({ config: testConfig }))

      act(() => {
        result.current.start()
      })

      // Simulate periodic Service Worker activity
      for (let second = 1; second <= 6; second++) {
        jest.advanceTimersByTime(1000)
        
        // Simulate Service Worker causing brief pause every 3 seconds
        if (second % 3 === 0) {
          jest.advanceTimersByTime(10) // 10ms pause
        }
        
        const precision = Math.abs((second * 1000) - result.current.state.timeElapsed)
        expect(precision).toBeLessThanOrEqual(100)
      }
    })
  })

  /**
   * Test statistical precision analysis
   * Business Rule: Timer precision should meet statistical accuracy requirements
   */
  describe('Statistical Precision Analysis', () => {
    test('should meet statistical accuracy requirements across browsers', async () => {
      const precisionResults: Record<string, number[]> = {}

      // Test each browser mock multiple times for statistical analysis
      for (const browserMock of browserMocks) {
        precisionResults[browserMock.name] = []

        // Run 10 test iterations per browser
        for (let iteration = 0; iteration < 10; iteration++) {
          // Setup browser mock
          global.performance.now = browserMock.performanceNowImpl
          global.setTimeout = browserMock.setTimeoutImpl as any
          
          jest.useFakeTimers()

          const { result } = renderHook(() => useTimer({ config: testConfig }))

          act(() => {
            result.current.start()
          })

          // Test at 5-second mark
          jest.advanceTimersByTime(5000)
          
          const precision = Math.abs(5000 - result.current.state.timeElapsed)
          precisionResults[browserMock.name].push(precision)

          jest.useRealTimers()
        }
      }

      // Analyze statistical results
      Object.entries(precisionResults).forEach(([browserName, precisions]) => {
        const average = precisions.reduce((sum, p) => sum + p, 0) / precisions.length
        const max = Math.max(...precisions)
        const min = Math.min(...precisions)
        const standardDeviation = Math.sqrt(
          precisions.reduce((sum, p) => sum + Math.pow(p - average, 2), 0) / precisions.length
        )

        console.log(`${browserName} Statistical Analysis:`, {
          average: average.toFixed(2) + 'ms',
          max: max.toFixed(2) + 'ms',
          min: min.toFixed(2) + 'ms',
          stdDev: standardDeviation.toFixed(2) + 'ms'
        })

        // Statistical requirements
        expect(average).toBeLessThan(50) // Average error should be well under 100ms
        expect(max).toBeLessThanOrEqual(100) // No individual test should exceed 100ms
        expect(standardDeviation).toBeLessThan(30) // Consistent performance
      })
    })

    test('should demonstrate precision improvement over basic setTimeout', async () => {
      jest.useFakeTimers()

      // Test with basic setTimeout implementation (baseline)
      const basicPrecisions: number[] = []
      let elapsedTime = 0
      
      const basicTimer = setInterval(() => {
        elapsedTime += 1000
      }, 1000)

      for (let second = 1; second <= 5; second++) {
        jest.advanceTimersByTime(1000)
        const precision = Math.abs((second * 1000) - elapsedTime)
        basicPrecisions.push(precision)
      }
      
      clearInterval(basicTimer)

      // Test with optimized timer implementation
      const optimizedPrecisions: number[] = []
      const { result } = renderHook(() => useTimer({ config: testConfig }))

      act(() => {
        result.current.start()
      })

      for (let second = 1; second <= 5; second++) {
        jest.advanceTimersByTime(1000)
        const precision = Math.abs((second * 1000) - result.current.state.timeElapsed)
        optimizedPrecisions.push(precision)
      }

      // Optimized timer should be more accurate than basic setTimeout
      const basicAverage = basicPrecisions.reduce((sum, p) => sum + p, 0) / basicPrecisions.length
      const optimizedAverage = optimizedPrecisions.reduce((sum, p) => sum + p, 0) / optimizedPrecisions.length

      expect(optimizedAverage).toBeLessThan(basicAverage)
      expect(optimizedAverage).toBeLessThan(50) // Should be well under 100ms requirement
    })
  })
})