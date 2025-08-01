/**
 * Utility Functions Unit Tests
 * 
 * Comprehensive test suite for utility functions focusing on:
 * - Time formatting and display utilities
 * - Timer calculation helpers
 * - Validation functions
 * - Configuration helpers
 * - Cross-browser compatibility utilities
 * - Performance and error handling
 */

import {
  formatTime,
  formatMinutesSeconds,
  calculateWorkoutDuration,
  calculateProgress,
  isValidTimerConfig,
  clampValue,
  debounce,
  throttle,
  createSafeTimer,
  getDeviceType,
  isMobile,
  hasWebAudioSupport,
  hasPWASupport,
  isStandalone,
  createDeepClone,
  mergeConfigs,
  generateId,
  localStorage
} from '../utils'

import { TimerConfig } from '../timer-engine'

// Mock performance API
const mockPerformanceNow = jest.fn()
global.performance.now = mockPerformanceNow

// Mock navigator for device detection
const mockNavigator = {
  userAgent: '',
  standalone: false,
  serviceWorker: { register: jest.fn() }
}
Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  writable: true
})

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0
}
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true
})

describe('Time Formatting Utilities', () => {
  /**
   * Test time formatting for timer display
   * Business Rule: Time should display in MM:SS format with proper zero padding
   */
  describe('formatTime', () => {
    test('should format time correctly for display', () => {
      // Test various time values
      const testCases = [
        { milliseconds: 0, expected: '00:00' },
        { milliseconds: 1000, expected: '00:01' },
        { milliseconds: 30000, expected: '00:30' },
        { milliseconds: 60000, expected: '01:00' },
        { milliseconds: 90000, expected: '01:30' },
        { milliseconds: 3600000, expected: '60:00' },
        { milliseconds: 7200000, expected: '120:00' },
        { milliseconds: 725000, expected: '12:05' },
        { milliseconds: 3725000, expected: '62:05' }
      ]

      testCases.forEach(({ milliseconds, expected }) => {
        expect(formatTime(milliseconds)).toBe(expected)
      })
    })

    test('should handle negative values gracefully', () => {
      expect(formatTime(-1000)).toBe('00:00')
      expect(formatTime(-30000)).toBe('00:00')
    })

    test('should handle very large values', () => {
      expect(formatTime(999999000)).toBe('16666:39')
      expect(formatTime(Number.MAX_SAFE_INTEGER)).toMatch(/^\d+:\d{2}$/)
    })

    test('should handle edge cases', () => {
      expect(formatTime(0)).toBe('00:00')
      expect(formatTime(999)).toBe('00:00') // Less than 1 second
      expect(formatTime(1001)).toBe('00:01') // Just over 1 second
    })
  })

  /**
   * Test alternative time formatting
   * Business Rule: Alternative format for settings and configuration display
   */
  describe('formatMinutesSeconds', () => {
    test('should format time with units', () => {
      expect(formatMinutesSeconds(0)).toBe('0:00')
      expect(formatMinutesSeconds(30)).toBe('0:30')
      expect(formatMinutesSeconds(60)).toBe('1:00')
      expect(formatMinutesSeconds(90)).toBe('1:30')
      expect(formatMinutesSeconds(3600)).toBe('60:00')
      expect(formatMinutesSeconds(3665)).toBe('61:05')
    })

    test('should handle fractional seconds', () => {
      expect(formatMinutesSeconds(30.5)).toBe('0:30')
      expect(formatMinutesSeconds(90.9)).toBe('1:30')
    })
  })
})

describe('Timer Calculation Utilities', () => {
  /**
   * Test workout duration calculation
   * Business Rule: Total duration = (work + rest) * rounds - final rest
   */
  describe('calculateWorkoutDuration', () => {
    test('should calculate correct workout duration', () => {
      const testConfigs: Array<{ config: TimerConfig; expected: number }> = [
        {
          config: { workDuration: 120, restDuration: 60, totalRounds: 3, enableWarning: true },
          expected: (120 + 60) * 3 - 60 // 3 rounds minus final rest = 480 seconds
        },
        {
          config: { workDuration: 180, restDuration: 60, totalRounds: 5, enableWarning: true },
          expected: (180 + 60) * 5 - 60 // 5 rounds minus final rest = 1140 seconds
        },
        {
          config: { workDuration: 60, restDuration: 30, totalRounds: 1, enableWarning: true },
          expected: 60 // Single round, no rest = 60 seconds
        }
      ]

      testConfigs.forEach(({ config, expected }) => {
        expect(calculateWorkoutDuration(config)).toBe(expected)
      })
    })

    test('should handle edge cases', () => {
      // Zero rounds
      expect(calculateWorkoutDuration({
        workDuration: 120, restDuration: 60, totalRounds: 0, enableWarning: true
      })).toBe(0)

      // Zero durations
      expect(calculateWorkoutDuration({
        workDuration: 0, restDuration: 60, totalRounds: 3, enableWarning: true
      })).toBe(120) // Only rest periods

      expect(calculateWorkoutDuration({
        workDuration: 120, restDuration: 0, totalRounds: 3, enableWarning: true
      })).toBe(360) // Only work periods
    })
  })

  /**
   * Test progress calculation
   * Business Rule: Progress = elapsed time / total workout duration
   */
  describe('calculateProgress', () => {
    test('should calculate accurate progress', () => {
      const totalDuration = 600 // 10 minutes
      
      expect(calculateProgress(0, totalDuration)).toBe(0)
      expect(calculateProgress(150, totalDuration)).toBe(0.25) // 25%
      expect(calculateProgress(300, totalDuration)).toBe(0.5)  // 50%
      expect(calculateProgress(450, totalDuration)).toBe(0.75) // 75%
      expect(calculateProgress(600, totalDuration)).toBe(1)    // 100%
    })

    test('should handle overflow gracefully', () => {
      expect(calculateProgress(700, 600)).toBe(1) // Clamped to 100%
      expect(calculateProgress(-100, 600)).toBe(0) // Clamped to 0%
    })

    test('should handle zero total duration', () => {
      expect(calculateProgress(100, 0)).toBe(1)
      expect(calculateProgress(0, 0)).toBe(0)
    })
  })
})

describe('Validation Utilities', () => {
  /**
   * Test timer configuration validation
   * Business Rule: Timer configs must have positive durations and round counts
   */
  describe('isValidTimerConfig', () => {
    test('should validate correct configurations', () => {
      const validConfigs: TimerConfig[] = [
        { workDuration: 120, restDuration: 60, totalRounds: 3, enableWarning: true },
        { workDuration: 1, restDuration: 1, totalRounds: 1, enableWarning: false },
        { workDuration: 300, restDuration: 90, totalRounds: 20, enableWarning: true }
      ]

      validConfigs.forEach(config => {
        expect(isValidTimerConfig(config)).toBe(true)
      })
    })

    test('should reject invalid configurations', () => {
      const invalidConfigs = [
        { workDuration: 0, restDuration: 60, totalRounds: 3, enableWarning: true },
        { workDuration: 120, restDuration: 0, totalRounds: 3, enableWarning: true },
        { workDuration: 120, restDuration: 60, totalRounds: 0, enableWarning: true },
        { workDuration: -120, restDuration: 60, totalRounds: 3, enableWarning: true },
        { workDuration: 120, restDuration: -60, totalRounds: 3, enableWarning: true },
        { workDuration: 120, restDuration: 60, totalRounds: -3, enableWarning: true }
      ]

      invalidConfigs.forEach(config => {
        expect(isValidTimerConfig(config as TimerConfig)).toBe(false)
      })
    })

    test('should handle partial configurations', () => {
      expect(isValidTimerConfig({})).toBe(false)
      expect(isValidTimerConfig({ workDuration: 120 })).toBe(false)
      expect(isValidTimerConfig({ workDuration: 120, restDuration: 60 })).toBe(false)
    })
  })

  /**
   * Test value clamping utility
   * Business Rule: Values should be constrained within valid ranges
   */
  describe('clampValue', () => {
    test('should clamp values within range', () => {
      expect(clampValue(5, 0, 10)).toBe(5)
      expect(clampValue(-5, 0, 10)).toBe(0)
      expect(clampValue(15, 0, 10)).toBe(10)
      expect(clampValue(0, 0, 10)).toBe(0)
      expect(clampValue(10, 0, 10)).toBe(10)
    })

    test('should handle edge cases', () => {
      expect(clampValue(5, 5, 5)).toBe(5) // Min = Max
      expect(clampValue(Number.NEGATIVE_INFINITY, 0, 10)).toBe(0)
      expect(clampValue(Number.POSITIVE_INFINITY, 0, 10)).toBe(10)
      expect(clampValue(NaN, 0, 10)).toBe(0) // NaN defaults to min
    })
  })
})

describe('Performance Utilities', () => {
  /**
   * Test debounce function
   * Business Rule: Debounce should delay execution until calls stop
   */
  describe('debounce', () => {
    jest.useFakeTimers()

    afterEach(() => {
      jest.clearAllTimers()
    })

    test('should debounce function calls', () => {
      const mockFn = jest.fn()
      const debouncedFn = debounce(mockFn, 100)

      // Call multiple times rapidly
      debouncedFn('call1')
      debouncedFn('call2')
      debouncedFn('call3')

      // Should not have been called yet
      expect(mockFn).not.toHaveBeenCalled()

      // Fast-forward time
      jest.advanceTimersByTime(100)

      // Should have been called once with last arguments
      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(mockFn).toHaveBeenCalledWith('call3')
    })

    test('should reset debounce timer on new calls', () => {
      const mockFn = jest.fn()
      const debouncedFn = debounce(mockFn, 100)

      debouncedFn('call1')
      jest.advanceTimersByTime(50)
      
      debouncedFn('call2')
      jest.advanceTimersByTime(50)
      
      // Should not have been called yet
      expect(mockFn).not.toHaveBeenCalled()
      
      jest.advanceTimersByTime(50)
      
      // Now should be called
      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(mockFn).toHaveBeenCalledWith('call2')
    })
  })

  /**
   * Test throttle function
   * Business Rule: Throttle should limit execution frequency
   */
  describe('throttle', () => {
    jest.useFakeTimers()

    afterEach(() => {
      jest.clearAllTimers()
    })

    test('should throttle function calls', () => {
      const mockFn = jest.fn()
      const throttledFn = throttle(mockFn, 100)

      // First call should execute immediately
      throttledFn('call1')
      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(mockFn).toHaveBeenCalledWith('call1')

      // Subsequent calls should be throttled
      throttledFn('call2')
      throttledFn('call3')
      expect(mockFn).toHaveBeenCalledTimes(1)

      // After throttle period
      jest.advanceTimersByTime(100)
      throttledFn('call4')
      expect(mockFn).toHaveBeenCalledTimes(2)
      expect(mockFn).toHaveBeenCalledWith('call4')
    })
  })

  /**
   * Test safe timer creation
   * Business Rule: Timers should handle cleanup and avoid memory leaks
   */
  describe('createSafeTimer', () => {
    test('should create timer with cleanup', () => {
      const mockCallback = jest.fn()
      const { start, stop } = createSafeTimer(mockCallback, 100)

      start()
      jest.advanceTimersByTime(100)
      
      expect(mockCallback).toHaveBeenCalledTimes(1)
      
      stop()
      jest.advanceTimersByTime(100)
      
      // Should not be called again after stop
      expect(mockCallback).toHaveBeenCalledTimes(1)
    })

    test('should handle multiple start/stop cycles', () => {
      const mockCallback = jest.fn()
      const { start, stop } = createSafeTimer(mockCallback, 100)

      start()
      stop()
      start()
      jest.advanceTimersByTime(100)
      
      expect(mockCallback).toHaveBeenCalledTimes(1)
    })
  })
})

describe('Device Detection Utilities', () => {
  beforeEach(() => {
    // Reset navigator mock
    mockNavigator.userAgent = ''
    mockNavigator.standalone = false
  })

  /**
   * Test device type detection
   * Business Rule: Device detection affects UI layout and features
   */
  describe('getDeviceType', () => {
    test('should detect mobile devices', () => {
      const mobileUserAgents = [
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        'Mozilla/5.0 (Linux; Android 10; SM-G975F)',
        'Mozilla/5.0 (Linux; Android 11; Pixel 5)'
      ]

      mobileUserAgents.forEach(ua => {
        mockNavigator.userAgent = ua
        expect(getDeviceType()).toBe('mobile')
      })
    })

    test('should detect tablet devices', () => {
      const tabletUserAgents = [
        'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
        'Mozilla/5.0 (Linux; Android 10; SM-T720)'
      ]

      tabletUserAgents.forEach(ua => {
        mockNavigator.userAgent = ua
        expect(getDeviceType()).toBe('tablet')
      })
    })

    test('should detect desktop devices', () => {
      const desktopUserAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'Mozilla/5.0 (X11; Linux x86_64)'
      ]

      desktopUserAgents.forEach(ua => {
        mockNavigator.userAgent = ua
        expect(getDeviceType()).toBe('desktop')
      })
    })
  })

  /**
   * Test mobile detection helper
   * Business Rule: Mobile detection affects feature availability
   */
  describe('isMobile', () => {
    test('should return true for mobile devices', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'
      expect(isMobile()).toBe(true)

      mockNavigator.userAgent = 'Mozilla/5.0 (Linux; Android 10; SM-G975F)'
      expect(isMobile()).toBe(true)
    })

    test('should return false for non-mobile devices', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      expect(isMobile()).toBe(false)

      mockNavigator.userAgent = 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)'
      expect(isMobile()).toBe(false)
    })
  })
})

describe('Browser Feature Detection', () => {
  /**
   * Test Web Audio API support detection
   * Business Rule: Audio features depend on Web Audio API availability
   */
  describe('hasWebAudioSupport', () => {
    test('should detect Web Audio API support', () => {
      global.AudioContext = jest.fn() as typeof AudioContext
      expect(hasWebAudioSupport()).toBe(true)

      (global as typeof global & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext = jest.fn() as typeof AudioContext
      delete (global as typeof global & { AudioContext?: typeof AudioContext }).AudioContext
      expect(hasWebAudioSupport()).toBe(true)

      delete (global as typeof global & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      expect(hasWebAudioSupport()).toBe(false)
    })
  })

  /**
   * Test PWA support detection
   * Business Rule: PWA features require service worker support
   */
  describe('hasPWASupport', () => {
    test('should detect PWA support', () => {
      expect(hasPWASupport()).toBe(true) // Navigator has serviceWorker mock

      delete (mockNavigator as Navigator & { serviceWorker?: ServiceWorkerContainer }).serviceWorker
      expect(hasPWASupport()).toBe(false)
    })
  })

  /**
   * Test standalone mode detection
   * Business Rule: Standalone apps may have different behaviors
   */
  describe('isStandalone', () => {
    test('should detect standalone mode', () => {
      mockNavigator.standalone = true
      expect(isStandalone()).toBe(true)

      mockNavigator.standalone = false
      expect(isStandalone()).toBe(false)
    })
  })
})

describe('Object Utilities', () => {
  /**
   * Test deep cloning utility
   * Business Rule: Configuration objects should be deeply cloned to prevent mutations
   */
  describe('createDeepClone', () => {
    test('should create deep clone of objects', () => {
      const original = {
        a: 1,
        b: { c: 2, d: { e: 3 } },
        f: [1, 2, { g: 4 }]
      }

      const cloned = createDeepClone(original)
      
      expect(cloned).toEqual(original)
      expect(cloned).not.toBe(original)
      expect(cloned.b).not.toBe(original.b)
      expect(cloned.b.d).not.toBe(original.b.d)
      expect(cloned.f).not.toBe(original.f)
      expect(cloned.f[2]).not.toBe(original.f[2])
    })

    test('should handle primitive values', () => {
      expect(createDeepClone(42)).toBe(42)
      expect(createDeepClone('test')).toBe('test')
      expect(createDeepClone(true)).toBe(true)
      expect(createDeepClone(null)).toBe(null)
      expect(createDeepClone(undefined)).toBe(undefined)
    })

    test('should handle dates and functions', () => {
      const date = new Date()
      expect(createDeepClone(date)).toEqual(date)
      expect(createDeepClone(date)).not.toBe(date)

      const fn = () => 'test'
      expect(createDeepClone(fn)).toBe(fn) // Functions are copied by reference
    })
  })

  /**
   * Test configuration merging
   * Business Rule: Configuration updates should merge with defaults properly
   */
  describe('mergeConfigs', () => {
    test('should merge configurations correctly', () => {
      const base: TimerConfig = {
        workDuration: 120,
        restDuration: 60,
        totalRounds: 3,
        enableWarning: true
      }

      const override: Partial<TimerConfig> = {
        workDuration: 180,
        totalRounds: 5
      }

      const merged = mergeConfigs(base, override)

      expect(merged).toEqual({
        workDuration: 180,
        restDuration: 60,
        totalRounds: 5,
        enableWarning: true
      })
    })

    test('should handle nested object merging', () => {
      const base = {
        timer: { work: 120, rest: 60 },
        audio: { volume: 0.8, enabled: true }
      }

      const override = {
        timer: { work: 180 },
        audio: { volume: 0.5 }
      }

      const merged = mergeConfigs(base, override)

      expect(merged).toEqual({
        timer: { work: 180, rest: 60 },
        audio: { volume: 0.5, enabled: true }
      })
    })
  })
})

describe('Utility Functions', () => {
  /**
   * Test unique ID generation
   * Business Rule: IDs should be unique and suitable for DOM elements
   */
  describe('generateId', () => {
    test('should generate unique IDs', () => {
      const ids = new Set()
      for (let i = 0; i < 1000; i++) {
        ids.add(generateId())
      }
      expect(ids.size).toBe(1000) // All unique
    })

    test('should accept custom prefix', () => {
      const id = generateId('timer')
      expect(id).toMatch(/^timer-[a-z0-9]+$/)
    })

    test('should use default prefix', () => {
      const id = generateId()
      expect(id).toMatch(/^id-[a-z0-9]+$/)
    })
  })

  /**
   * Test localStorage utility wrapper
   * Business Rule: localStorage should handle errors gracefully
   */
  describe('localStorage wrapper', () => {
    test('should handle localStorage operations', () => {
      mockLocalStorage.getItem.mockReturnValue('{"test": true}')
      
      expect(localStorage.get('key')).toEqual({ test: true })
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('key')

      localStorage.set('key', { data: 'value' })
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('key', '{"data":"value"}')

      localStorage.remove('key')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('key')

      localStorage.clear()
      expect(mockLocalStorage.clear).toHaveBeenCalled()
    })

    test('should handle localStorage errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error')
      })

      expect(localStorage.get('key')).toBeNull()
      expect(() => localStorage.get('key')).not.toThrow()
    })

    test('should handle JSON parsing errors', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json')
      
      expect(localStorage.get('key')).toBeNull()
      expect(() => localStorage.get('key')).not.toThrow()
    })
  })
})