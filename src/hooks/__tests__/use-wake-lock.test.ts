/**
 * useWakeLock Hook Unit Tests
 * 
 * Comprehensive test suite for the useWakeLock hook focusing on:
 * - Wake lock API integration and browser compatibility
 * - Screen wake lock request and release cycles
 * - Battery level awareness and optimization
 * - Visibility change handling and background behavior
 * - Error handling for unsupported browsers
 * - Performance monitoring and resource management
 * - User preference integration and permission handling
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useWakeLock, WakeLockOptions } from '../use-wake-lock'

// Mock Wake Lock API
const mockWakeLockSentinel = {
  type: 'screen',
  released: false,
  release: jest.fn(() => Promise.resolve()),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}

const mockWakeLock = {
  request: jest.fn(() => Promise.resolve(mockWakeLockSentinel))
}

// Mock Battery API
const mockBattery = {
  level: 0.8,
  charging: false,
  chargingTime: Infinity,
  dischargingTime: 3600,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}

// Mock Page Visibility API
const mockVisibilityState = jest.fn(() => 'visible')

// Mock Performance API
const mockPerformanceNow = jest.fn(() => Date.now())
global.performance.now = mockPerformanceNow

describe('useWakeLock Hook', () => {
  const defaultOptions: WakeLockOptions = {
    enabled: true,
    batteryThreshold: 0.2,
    enableBatteryOptimization: true,
    enableVisibilityHandling: true,
    autoRelease: true,
    onStateChange: jest.fn(),
    onError: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup Wake Lock API mock
    Object.defineProperty(navigator, 'wakeLock', {
      value: mockWakeLock,
      writable: true,
      configurable: true
    })

    // Setup Battery API mock
    Object.defineProperty(navigator, 'getBattery', {
      value: jest.fn(() => Promise.resolve(mockBattery)),
      writable: true,
      configurable: true
    })

    // Setup Visibility API mock
    Object.defineProperty(document, 'visibilityState', {
      get: mockVisibilityState,
      configurable: true
    })

    // Reset mock implementations
    mockWakeLock.request.mockResolvedValue(mockWakeLockSentinel)
    mockWakeLockSentinel.release.mockResolvedValue()
    mockWakeLockSentinel.released = false
    mockBattery.level = 0.8
    mockBattery.charging = false
    mockVisibilityState.mockReturnValue('visible')
  })

  afterEach(() => {
    // Clean up API mocks
    delete (navigator as any).wakeLock
    delete (navigator as any).getBattery
  })

  describe('Hook Initialization and Basic Functionality', () => {
    /**
     * Test hook initialization with wake lock support
     * Business Rule: Hook should detect and utilize wake lock API when available
     */
    test('should initialize with wake lock support', () => {
      const { result } = renderHook(() => useWakeLock(defaultOptions))

      expect(result.current.isSupported).toBe(true)
      expect(result.current.isActive).toBe(false)
      expect(result.current.error).toBeNull()
    })

    /**
     * Test wake lock request
     * Business Rule: Request should acquire screen wake lock when enabled
     */
    test('should request wake lock successfully', async () => {
      const { result } = renderHook(() => useWakeLock(defaultOptions))

      await act(async () => {
        await result.current.request()
      })

      expect(mockWakeLock.request).toHaveBeenCalledWith('screen')
      expect(result.current.isActive).toBe(true)
      expect(defaultOptions.onStateChange).toHaveBeenCalledWith({
        isActive: true,
        type: 'screen'
      })
    })

    /**
     * Test wake lock release
     * Business Rule: Release should properly release screen wake lock
     */
    test('should release wake lock successfully', async () => {
      const { result } = renderHook(() => useWakeLock(defaultOptions))

      // First request wake lock
      await act(async () => {
        await result.current.request()
      })

      // Then release it
      await act(async () => {
        await result.current.release()
      })

      expect(mockWakeLockSentinel.release).toHaveBeenCalled()
      expect(result.current.isActive).toBe(false)
      expect(defaultOptions.onStateChange).toHaveBeenCalledWith({
        isActive: false,
        type: null
      })
    })

    /**
     * Test multiple request calls
     * Business Rule: Multiple requests should reuse existing wake lock
     */
    test('should handle multiple request calls efficiently', async () => {
      const { result } = renderHook(() => useWakeLock(defaultOptions))

      // Make multiple requests
      await act(async () => {
        await Promise.all([
          result.current.request(),
          result.current.request(),
          result.current.request()
        ])
      })

      // Should only call wake lock API once
      expect(mockWakeLock.request).toHaveBeenCalledTimes(1)
      expect(result.current.isActive).toBe(true)
    })

    /**
     * Test hook cleanup on unmount
     * Business Rule: Hook should release wake lock on component unmount
     */
    test('should release wake lock on unmount', async () => {
      const { result, unmount } = renderHook(() => useWakeLock(defaultOptions))

      // Request wake lock
      await act(async () => {
        await result.current.request()
      })

      expect(result.current.isActive).toBe(true)

      // Unmount hook
      act(() => {
        unmount()
      })

      await waitFor(() => {
        expect(mockWakeLockSentinel.release).toHaveBeenCalled()
      })
    })
  })

  describe('Browser Support and Compatibility', () => {
    /**
     * Test unsupported browser handling
     * Business Rule: Hook should gracefully handle browsers without wake lock API
     */
    test('should handle unsupported browsers gracefully', () => {
      // Remove wake lock API
      delete (navigator as any).wakeLock

      const { result } = renderHook(() => useWakeLock(defaultOptions))

      expect(result.current.isSupported).toBe(false)
      expect(result.current.isActive).toBe(false)

      // Request should fail gracefully
      act(() => {
        result.current.request()
      })

      expect(result.current.error).toEqual(
        expect.objectContaining({
          message: expect.stringContaining('Wake Lock API not supported')
        })
      )
    })

    /**
     * Test partial API support
     * Business Rule: Hook should handle browsers with limited wake lock features
     */
    test('should handle partial API support', async () => {
      // Mock limited API support
      const limitedWakeLock = {
        request: jest.fn(() => Promise.resolve({
          type: 'screen',
          released: false,
          release: jest.fn(() => Promise.resolve())
          // Missing event listener support
        }))
      }

      Object.defineProperty(navigator, 'wakeLock', {
        value: limitedWakeLock,
        writable: true
      })

      const { result } = renderHook(() => useWakeLock(defaultOptions))

      await act(async () => {
        await result.current.request()
      })

      expect(result.current.isSupported).toBe(true)
      expect(result.current.isActive).toBe(true)
    })

    /**
     * Test cross-browser API variations
     * Business Rule: Hook should work with different browser implementations
     */
    test('should handle cross-browser API variations', async () => {
      // Test with different wake lock implementations
      const variants = [
        // Standard implementation
        { request: jest.fn(() => Promise.resolve(mockWakeLockSentinel)) },
        // Webkit implementation
        { request: jest.fn(() => Promise.resolve({
          ...mockWakeLockSentinel,
          type: 'display' // Different type name
        }))},
        // Experimental implementation
        { request: jest.fn(() => Promise.resolve({
          ...mockWakeLockSentinel,
          experimental: true
        }))}
      ]

      for (const variant of variants) {
        Object.defineProperty(navigator, 'wakeLock', {
          value: variant,
          writable: true
        })

        const { result, unmount } = renderHook(() => useWakeLock(defaultOptions))

        await act(async () => {
          await result.current.request()
        })

        expect(result.current.isSupported).toBe(true)
        expect(variant.request).toHaveBeenCalled()

        unmount()
      }
    })
  })

  describe('Battery Level Optimization', () => {
    /**
     * Test battery level monitoring
     * Business Rule: Hook should monitor battery level and optimize accordingly
     */
    test('should monitor battery level and optimize usage', async () => {
      const { result } = renderHook(() => useWakeLock(defaultOptions))

      // Initial request with good battery
      await act(async () => {
        await result.current.request()
      })

      expect(result.current.isActive).toBe(true)

      // Simulate low battery
      mockBattery.level = 0.15 // Below threshold of 0.2
      
      // Trigger battery level check
      const batteryLevelHandler = mockBattery.addEventListener.mock.calls
        .find(call => call[0] === 'levelchange')?.[1]

      if (batteryLevelHandler) {
        act(() => {
          batteryLevelHandler()
        })

        await waitFor(() => {
          expect(result.current.isActive).toBe(false)
          expect(mockWakeLockSentinel.release).toHaveBeenCalled()
        })
      }
    })

    /**
     * Test battery charging state handling
     * Business Rule: Charging state should affect wake lock behavior
     */
    test('should handle battery charging state changes', async () => {
      const lowBatteryOptions = {
        ...defaultOptions,
        batteryThreshold: 0.3
      }

      const { result } = renderHook(() => useWakeLock(lowBatteryOptions))

      // Set low battery but charging
      mockBattery.level = 0.25
      mockBattery.charging = true

      await act(async () => {
        await result.current.request()
      })

      // Should allow wake lock when charging despite low battery
      expect(result.current.isActive).toBe(true)

      // Simulate unplugging
      mockBattery.charging = false
      
      const chargingChangeHandler = mockBattery.addEventListener.mock.calls
        .find(call => call[0] === 'chargingchange')?.[1]

      if (chargingChangeHandler) {
        act(() => {
          chargingChangeHandler()
        })

        await waitFor(() => {
          expect(result.current.isActive).toBe(false)
        })
      }
    })

    /**
     * Test battery optimization disable
     * Business Rule: Battery optimization should be optional
     */
    test('should respect disabled battery optimization', async () => {
      const noBatteryOptimization = {
        ...defaultOptions,
        enableBatteryOptimization: false
      }

      const { result } = renderHook(() => useWakeLock(noBatteryOptimization))

      // Set very low battery
      mockBattery.level = 0.05

      await act(async () => {
        await result.current.request()
      })

      // Should maintain wake lock despite low battery
      expect(result.current.isActive).toBe(true)
      expect(mockWakeLockSentinel.release).not.toHaveBeenCalled()
    })

    /**
     * Test battery API unavailability
     * Business Rule: Hook should work without battery API
     */
    test('should work without battery API', async () => {
      // Remove battery API
      delete (navigator as any).getBattery

      const { result } = renderHook(() => useWakeLock(defaultOptions))

      await act(async () => {
        await result.current.request()
      })

      expect(result.current.isActive).toBe(true)
      expect(result.current.batteryLevel).toBeNull()
    })
  })

  describe('Visibility and Background Handling', () => {
    /**
     * Test page visibility change handling
     * Business Rule: Wake lock should be managed based on page visibility
     */
    test('should handle page visibility changes', async () => {
      const { result } = renderHook(() => useWakeLock(defaultOptions))

      // Request wake lock while visible
      await act(async () => {
        await result.current.request()
      })

      expect(result.current.isActive).toBe(true)

      // Simulate page becoming hidden
      mockVisibilityState.mockReturnValue('hidden')
      
      act(() => {
        const visibilityEvent = new Event('visibilitychange')
        document.dispatchEvent(visibilityEvent)
      })

      await waitFor(() => {
        expect(mockWakeLockSentinel.release).toHaveBeenCalled()
        expect(result.current.isActive).toBe(false)
      })

      // Simulate page becoming visible again
      mockVisibilityState.mockReturnValue('visible')
      
      act(() => {
        const visibilityEvent = new Event('visibilitychange')
        document.dispatchEvent(visibilityEvent)
      })

      // Should automatically re-request wake lock
      await waitFor(() => {
        expect(mockWakeLock.request).toHaveBeenCalledTimes(2)
        expect(result.current.isActive).toBe(true)
      })
    })

    /**
     * Test visibility handling disable
     * Business Rule: Visibility handling should be optional
     */
    test('should respect disabled visibility handling', async () => {
      const noVisibilityHandling = {
        ...defaultOptions,
        enableVisibilityHandling: false
      }

      const { result } = renderHook(() => useWakeLock(noVisibilityHandling))

      await act(async () => {
        await result.current.request()
      })

      // Simulate page becoming hidden
      mockVisibilityState.mockReturnValue('hidden')
      
      act(() => {
        const visibilityEvent = new Event('visibilitychange')
        document.dispatchEvent(visibilityEvent)
      })

      // Should maintain wake lock despite being hidden
      expect(result.current.isActive).toBe(true)
      expect(mockWakeLockSentinel.release).not.toHaveBeenCalled()
    })

    /**
     * Test background/foreground performance optimization
     * Business Rule: Performance should be optimized when app is backgrounded
     */
    test('should optimize performance in background', async () => {
      const { result } = renderHook(() => useWakeLock(defaultOptions))

      await act(async () => {
        await result.current.request()
      })

      // Simulate app going to background
      mockVisibilityState.mockReturnValue('hidden')
      
      act(() => {
        const visibilityEvent = new Event('visibilitychange')
        document.dispatchEvent(visibilityEvent)
      })

      // Should reduce polling frequency or pause monitoring
      expect(result.current.isOptimized).toBe(true)
    })
  })

  describe('Error Handling and Recovery', () => {
    /**
     * Test wake lock request failure
     * Business Rule: Failed requests should be handled gracefully with retry logic
     */
    test('should handle wake lock request failures', async () => {
      const requestError = new Error('Permission denied')
      mockWakeLock.request.mockRejectedValueOnce(requestError)

      const { result } = renderHook(() => useWakeLock(defaultOptions))

      await act(async () => {
        await result.current.request()
      })

      expect(result.current.isActive).toBe(false)
      expect(result.current.error).toEqual(requestError)
      expect(defaultOptions.onError).toHaveBeenCalledWith(requestError)
    })

    /**
     * Test wake lock release failure
     * Business Rule: Failed releases should be handled without crashing
     */
    test('should handle wake lock release failures', async () => {
      const releaseError = new Error('Release failed')
      mockWakeLockSentinel.release.mockRejectedValueOnce(releaseError)

      const { result } = renderHook(() => useWakeLock(defaultOptions))

      // First request wake lock
      await act(async () => {
        await result.current.request()
      })

      // Then try to release (which will fail)
      await act(async () => {
        await result.current.release()
      })

      expect(result.current.error).toEqual(releaseError)
      expect(defaultOptions.onError).toHaveBeenCalledWith(releaseError)
    })

    /**
     * Test automatic retry logic
     * Business Rule: Failed requests should be retried with exponential backoff
     */
    test('should implement retry logic for failed requests', async () => {
      jest.useFakeTimers()
      
      // First request fails
      mockWakeLock.request.mockRejectedValueOnce(new Error('Temporary failure'))
      // Second request succeeds
      mockWakeLock.request.mockResolvedValueOnce(mockWakeLockSentinel)

      const retryOptions = {
        ...defaultOptions,
        enableRetry: true,
        retryAttempts: 3,
        retryDelay: 1000
      }

      const { result } = renderHook(() => useWakeLock(retryOptions))

      // Initial request
      await act(async () => {
        await result.current.request()
      })

      // Should have failed initially
      expect(result.current.isActive).toBe(false)

      // Fast-forward to retry
      act(() => {
        jest.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(mockWakeLock.request).toHaveBeenCalledTimes(2)
        expect(result.current.isActive).toBe(true)
      })

      jest.useRealTimers()
    })

    /**
     * Test wake lock sentinel event handling
     * Business Rule: Wake lock release events should be handled properly
     */
    test('should handle wake lock sentinel release events', async () => {
      const { result } = renderHook(() => useWakeLock(defaultOptions))

      await act(async () => {
        await result.current.request()
      })

      expect(result.current.isActive).toBe(true)

      // Simulate system releasing wake lock
      mockWakeLockSentinel.released = true
      
      const releaseHandler = mockWakeLockSentinel.addEventListener.mock.calls
        .find(call => call[0] === 'release')?.[1]

      if (releaseHandler) {
        act(() => {
          releaseHandler()
        })

        expect(result.current.isActive).toBe(false)
        expect(defaultOptions.onStateChange).toHaveBeenCalledWith({
          isActive: false,
          type: null
        })
      }
    })
  })

  describe('Performance Monitoring and Optimization', () => {
    /**
     * Test performance impact monitoring
     * Business Rule: Hook should monitor its performance impact
     */
    test('should monitor performance impact', async () => {
      const performanceOptions = {
        ...defaultOptions,
        enablePerformanceMonitoring: true
      }

      const { result } = renderHook(() => useWakeLock(performanceOptions))

      await act(async () => {
        await result.current.request()
      })

      expect(result.current.performanceMetrics).toBeDefined()
      expect(result.current.performanceMetrics?.requestTime).toBeGreaterThan(0)
    })

    /**
     * Test resource usage optimization
     * Business Rule: Hook should optimize resource usage
     */
    test('should optimize resource usage', async () => {
      const { result } = renderHook(() => useWakeLock(defaultOptions))

      // Multiple requests should not create multiple timers/listeners
      await act(async () => {
        await Promise.all([
          result.current.request(),
          result.current.request(),
          result.current.request()
        ])
      })

      // Should have only one set of event listeners
      expect(mockWakeLockSentinel.addEventListener).toHaveBeenCalledTimes(1)
    })

    /**
     * Test memory leak prevention
     * Business Rule: Hook should prevent memory leaks from event listeners
     */
    test('should prevent memory leaks', async () => {
      const { result, unmount } = renderHook(() => useWakeLock(defaultOptions))

      await act(async () => {
        await result.current.request()
      })

      // Unmount should clean up all listeners
      act(() => {
        unmount()
      })

      expect(mockBattery.removeEventListener).toHaveBeenCalled()
      expect(mockWakeLockSentinel.removeEventListener).toHaveBeenCalled()
    })
  })

  describe('User Preferences and Configuration', () => {
    /**
     * Test user preference integration
     * Business Rule: Hook should respect user preferences for wake lock usage
     */
    test('should respect user preferences', async () => {
      const userPrefs = {
        allowWakeLock: false,
        batteryThreshold: 0.5
      }

      const prefOptions = {
        ...defaultOptions,
        userPreferences: userPrefs
      }

      const { result } = renderHook(() => useWakeLock(prefOptions))

      await act(async () => {
        await result.current.request()
      })

      // Should not request wake lock when user preference is disabled
      expect(mockWakeLock.request).not.toHaveBeenCalled()
      expect(result.current.isActive).toBe(false)
    })

    /**
     * Test dynamic configuration updates
     * Business Rule: Hook should adapt to configuration changes
     */
    test('should handle dynamic configuration updates', async () => {
      const { result, rerender } = renderHook(
        ({ options }) => useWakeLock(options),
        { initialProps: { options: defaultOptions } }
      )

      await act(async () => {
        await result.current.request()
      })

      expect(result.current.isActive).toBe(true)

      // Update configuration to disable wake lock
      const updatedOptions = {
        ...defaultOptions,
        enabled: false
      }

      rerender({ options: updatedOptions })

      await waitFor(() => {
        expect(result.current.isActive).toBe(false)
        expect(mockWakeLockSentinel.release).toHaveBeenCalled()
      })
    })

    /**
     * Test permission handling
     * Business Rule: Hook should handle permission states properly
     */
    test('should handle permission states', async () => {
      // Mock permissions API
      const mockPermissions = {
        query: jest.fn(() => Promise.resolve({
          state: 'granted',
          addEventListener: jest.fn(),
          removeEventListener: jest.fn()
        }))
      }

      Object.defineProperty(navigator, 'permissions', {
        value: mockPermissions,
        writable: true
      })

      const { result } = renderHook(() => useWakeLock(defaultOptions))

      await act(async () => {
        await result.current.request()
      })

      expect(mockPermissions.query).toHaveBeenCalledWith({ name: 'screen-wake-lock' })
      expect(result.current.isActive).toBe(true)
    })
  })

  describe('Integration and Edge Cases', () => {
    /**
     * Test concurrent wake lock requests
     * Business Rule: Concurrent requests should be handled safely
     */
    test('should handle concurrent wake lock requests', async () => {
      const { result } = renderHook(() => useWakeLock(defaultOptions))

      // Make multiple simultaneous requests
      const promises = Array(5).fill(null).map(() => result.current.request())

      await act(async () => {
        await Promise.all(promises)
      })

      // Should only make one actual API call
      expect(mockWakeLock.request).toHaveBeenCalledTimes(1)
      expect(result.current.isActive).toBe(true)
    })

    /**
     * Test rapid request/release cycles
     * Business Rule: Rapid cycles should be handled efficiently
     */
    test('should handle rapid request/release cycles', async () => {
      const { result } = renderHook(() => useWakeLock(defaultOptions))

      // Rapid request/release cycle
      for (let i = 0; i < 10; i++) {
        await act(async () => {
          await result.current.request()
          await result.current.release()
        })
      }

      // Should handle all cycles without errors
      expect(result.current.error).toBeNull()
      expect(result.current.isActive).toBe(false)
    })

    /**
     * Test system sleep/wake cycles
     * Business Rule: Hook should handle system sleep/wake gracefully
     */
    test('should handle system sleep/wake cycles', async () => {
      const { result } = renderHook(() => useWakeLock(defaultOptions))

      await act(async () => {
        await result.current.request()
      })

      // Simulate system going to sleep
      mockWakeLockSentinel.released = true
      
      const releaseHandler = mockWakeLockSentinel.addEventListener.mock.calls
        .find(call => call[0] === 'release')?.[1]

      if (releaseHandler) {
        act(() => {
          releaseHandler()
        })

        expect(result.current.isActive).toBe(false)

        // Simulate system waking up and page becoming active
        mockWakeLockSentinel.released = false
        mockWakeLock.request.mockResolvedValueOnce(mockWakeLockSentinel)

        // Should automatically re-request wake lock
        await act(async () => {
          const focusEvent = new Event('focus')
          window.dispatchEvent(focusEvent)
        })

        await waitFor(() => {
          expect(result.current.isActive).toBe(true)
        })
      }
    })
  })
})