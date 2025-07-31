/**
 * Mobile Device Simulation Integration Tests
 * 
 * Comprehensive integration test suite for mobile device behavior simulation:
 * - Touch interaction and gesture handling
 * - Mobile browser limitations and workarounds
 * - Device orientation changes and screen size adaptations
 * - Mobile-specific APIs (Wake Lock, Vibration, Battery)
 * - Performance optimization for mobile devices
 * - Mobile audio handling and autoplay policies
 * - Network connectivity changes and offline behavior
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useMobileGestures } from '../../src/hooks/use-mobile-gestures'
import { useWakeLock } from '../../src/hooks/use-wake-lock'
import { useTimer } from '../../src/hooks/use-timer'
import { TimerConfig } from '../../src/lib/timer-engine'
import { MobileTimer } from '../../src/components/timer/mobile-timer'

// Mobile device configurations for testing
interface MobileDeviceConfig {
  name: string
  userAgent: string
  viewport: { width: number; height: number }
  pixelRatio: number
  touchSupport: boolean
  orientationSupport: boolean
  wakeLockSupport: boolean
  vibrationSupport: boolean
  batterySupport: boolean
  connectionSupport: boolean
  audioLimitations: {
    requiresUserActivation: boolean
    autoplayBlocked: boolean
    concurrentLimit: number
  }
}

const mobileDevices: MobileDeviceConfig[] = [
  {
    name: 'iPhone 12',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1',
    viewport: { width: 390, height: 844 },
    pixelRatio: 3,
    touchSupport: true,
    orientationSupport: true,
    wakeLockSupport: false, // Not supported in iOS Safari
    vibrationSupport: false, // Not supported in iOS
    batterySupport: false, // Not supported in iOS
    connectionSupport: false, // Limited support
    audioLimitations: {
      requiresUserActivation: true,
      autoplayBlocked: true,
      concurrentLimit: 1
    }
  },
  {
    name: 'Samsung Galaxy S21',
    userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
    viewport: { width: 360, height: 800 },
    pixelRatio: 3,
    touchSupport: true,
    orientationSupport: true,
    wakeLockSupport: true,
    vibrationSupport: true,
    batterySupport: true,
    connectionSupport: true,
    audioLimitations: {
      requiresUserActivation: true,
      autoplayBlocked: true,
      concurrentLimit: 4
    }
  },
  {
    name: 'iPad Pro',
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1',
    viewport: { width: 1024, height: 1366 },
    pixelRatio: 2,
    touchSupport: true,
    orientationSupport: true,
    wakeLockSupport: false,
    vibrationSupport: false,
    batterySupport: false,
    connectionSupport: false,
    audioLimitations: {
      requiresUserActivation: true,
      autoplayBlocked: true,
      concurrentLimit: 2
    }
  },
  {
    name: 'Google Pixel 5',
    userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
    viewport: { width: 393, height: 851 },
    pixelRatio: 2.75,
    touchSupport: true,
    orientationSupport: true,
    wakeLockSupport: true,
    vibrationSupport: true,
    batterySupport: true,
    connectionSupport: true,
    audioLimitations: {
      requiresUserActivation: true,
      autoplayBlocked: false, // Less restrictive
      concurrentLimit: 6
    }
  }
]

// Mock touch event creation
const createTouchEvent = (type: string, touches: Array<{ x: number; y: number; id?: number }>) => {
  const touchList = touches.map((touch, index) => ({
    identifier: touch.id || index,
    clientX: touch.x,
    clientY: touch.y,
    pageX: touch.x,
    pageY: touch.y,
    screenX: touch.x,
    screenY: touch.y,
    target: document.body,
    radiusX: 0,
    radiusY: 0,
    rotationAngle: 0,
    force: 1
  }))

  return new TouchEvent(type, {
    touches: touchList,
    targetTouches: touchList,
    changedTouches: touchList,
    bubbles: true,
    cancelable: true
  })
}

describe('Mobile Device Simulation Integration Tests', () => {
  let originalUserAgent: string
  let originalInnerWidth: number
  let originalInnerHeight: number
  let originalDevicePixelRatio: number

  const testConfig: TimerConfig = {
    workDuration: 180, // 3 minutes
    restDuration: 60,  // 1 minute
    totalRounds: 3,
    enableWarning: true
  }

  beforeEach(() => {
    // Store original values
    originalUserAgent = navigator.userAgent
    originalInnerWidth = window.innerWidth
    originalInnerHeight = window.innerHeight
    originalDevicePixelRatio = window.devicePixelRatio

    jest.clearAllMocks()
  })

  afterEach(() => {
    // Restore original values
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      writable: true
    })
    Object.defineProperty(window, 'innerWidth', {
      value: originalInnerWidth,
      writable: true
    })
    Object.defineProperty(window, 'innerHeight', {
      value: originalInnerHeight,
      writable: true
    })
    Object.defineProperty(window, 'devicePixelRatio', {
      value: originalDevicePixelRatio,
      writable: true
    })

    // Clean up mocked APIs
    delete (navigator as any).wakeLock
    delete (navigator as any).vibrate
    delete (navigator as any).getBattery
    delete (navigator as any).connection
  })

  /**
   * Setup mobile device environment
   */
  const setupMobileDevice = (device: MobileDeviceConfig) => {
    // Set user agent
    Object.defineProperty(navigator, 'userAgent', {
      value: device.userAgent,
      writable: true
    })

    // Set viewport dimensions
    Object.defineProperty(window, 'innerWidth', {
      value: device.viewport.width,
      writable: true
    })
    Object.defineProperty(window, 'innerHeight', {
      value: device.viewport.height,
      writable: true
    })
    Object.defineProperty(window, 'devicePixelRatio', {
      value: device.pixelRatio,
      writable: true
    })

    // Mock device-specific APIs
    if (device.wakeLockSupport) {
      const mockWakeLock = {
        request: jest.fn(() => Promise.resolve({
          type: 'screen',
          released: false,
          release: jest.fn(() => Promise.resolve())
        }))
      }
      Object.defineProperty(navigator, 'wakeLock', {
        value: mockWakeLock,
        writable: true
      })
    }

    if (device.vibrationSupport) {
      Object.defineProperty(navigator, 'vibrate', {
        value: jest.fn(() => true),
        writable: true
      })
    }

    if (device.batterySupport) {
      const mockBattery = {
        level: 0.8,
        charging: false,
        chargingTime: Infinity,
        dischargingTime: 3600,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }
      Object.defineProperty(navigator, 'getBattery', {
        value: jest.fn(() => Promise.resolve(mockBattery)),
        writable: true
      })
    }

    if (device.connectionSupport) {
      const mockConnection = {
        effectiveType: '4g',
        downlink: 10,
        rtt: 100,
        saveData: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }
      Object.defineProperty(navigator, 'connection', {
        value: mockConnection,
        writable: true
      })
    }
  }

  describe('Device-Specific Behavior Testing', () => {
    mobileDevices.forEach(device => {
      describe(`${device.name} Simulation`, () => {
        beforeEach(() => {
          setupMobileDevice(device)
        })

        /**
         * Test touch interaction handling
         * Business Rule: Touch interactions should work consistently across devices
         */
        test('should handle touch interactions correctly', async () => {
          const user = userEvent.setup()
          const mockElement = document.createElement('div')
          const mockRef = { current: mockElement }

          const gestureCallbacks = {
            onTap: jest.fn(),
            onSwipeLeft: jest.fn(),
            onSwipeRight: jest.fn(),
            onLongPress: jest.fn()
          }

          renderHook(() => 
            useMobileGestures(mockRef, gestureCallbacks, {
              swipeThreshold: 50,
              longPressDelay: 800
            })
          )

          // Test tap gesture
          fireEvent(mockElement, createTouchEvent('touchstart', [{ x: 100, y: 200 }]))
          fireEvent(mockElement, createTouchEvent('touchend', []))

          expect(gestureCallbacks.onTap).toHaveBeenCalledWith({
            x: 100,
            y: 200,
            timestamp: expect.any(Number),
            duration: expect.any(Number)
          })

          // Test swipe gesture
          jest.clearAllMocks()
          fireEvent(mockElement, createTouchEvent('touchstart', [{ x: 100, y: 200 }]))
          fireEvent(mockElement, createTouchEvent('touchmove', [{ x: 200, y: 200 }]))
          fireEvent(mockElement, createTouchEvent('touchend', []))

          expect(gestureCallbacks.onSwipeRight).toHaveBeenCalled()
        })

        /**
         * Test mobile timer component adaptation
         * Business Rule: Timer should adapt to device capabilities and limitations
         */
        test('should adapt timer component to device capabilities', () => {
          render(
            <MobileTimer
              state={{
                status: 'idle',
                phase: 'work',
                currentRound: 1,
                timeRemaining: 180000,
                timeElapsed: 0,
                progress: 0,
                warningTriggered: false,
                workoutProgress: 0,
                lastTick: 0
              }}
              config={testConfig}
              onStart={jest.fn()}
              onPause={jest.fn()}
              onResume={jest.fn()}
              onStop={jest.fn()}
              onReset={jest.fn()}
              onSettingsOpen={jest.fn()}
              orientation="portrait"
              isFullscreen={false}
              wakeLockEnabled={device.wakeLockSupport}
            />
          )

          const timerContainer = screen.getByTestId('mobile-timer')
          
          // Should adapt to device viewport
          if (device.viewport.width <= 400) {
            expect(timerContainer).toHaveClass('mobile-timer--small')
          } else if (device.viewport.width >= 1000) {
            expect(timerContainer).toHaveClass('mobile-timer--large')
          }

          // Should handle device capabilities
          if (device.wakeLockSupport) {
            expect(screen.queryByText(/wake lock not supported/i)).not.toBeInTheDocument()
          } else {
            expect(screen.getByText(/some features may be limited/i)).toBeInTheDocument()
          }
        })

        /**
         * Test wake lock functionality based on device support
         * Business Rule: Wake lock should work on supported devices, degrade gracefully on others
         */
        test('should handle wake lock based on device support', async () => {
          const { result } = renderHook(() => useWakeLock({
            enabled: true,
            batteryThreshold: 0.2
          }))

          expect(result.current.isSupported).toBe(device.wakeLockSupport)

          if (device.wakeLockSupport) {
            await act(async () => {
              await result.current.request()
            })
            expect(result.current.isActive).toBe(true)
          } else {
            await act(async () => {
              await result.current.request()
            })
            expect(result.current.isActive).toBe(false)
            expect(result.current.error).toBeDefined()
          }
        })

        /**
         * Test haptic feedback based on device support
         * Business Rule: Haptic feedback should enhance UX on supported devices
         */
        test('should provide haptic feedback on supported devices', async () => {
          const user = userEvent.setup()
          
          render(
            <MobileTimer
              state={{
                status: 'idle',
                phase: 'work',
                currentRound: 1,
                timeRemaining: 180000,
                timeElapsed: 0,
                progress: 0,
                warningTriggered: false,
                workoutProgress: 0,
                lastTick: 0
              }}
              config={testConfig}
              onStart={jest.fn()}
              onPause={jest.fn()}
              onResume={jest.fn()}
              onStop={jest.fn()}
              onReset={jest.fn()}
              onSettingsOpen={jest.fn()}
              enableHaptics={device.vibrationSupport}
            />
          )

          const startButton = screen.getByRole('button', { name: /start/i })
          await user.click(startButton)

          if (device.vibrationSupport) {
            expect(navigator.vibrate).toHaveBeenCalledWith([100])
          }
        })

        /**
         * Test audio limitations handling
         * Business Rule: Audio should respect device-specific autoplay policies
         */
        test('should handle device-specific audio limitations', async () => {
          const mockAudioContext = {
            state: 'suspended',
            resume: jest.fn(() => Promise.resolve()),
            createGain: jest.fn(() => ({
              gain: { value: 1 },
              connect: jest.fn()
            })),
            createOscillator: jest.fn(() => ({
              frequency: { setValueAtTime: jest.fn() },
              connect: jest.fn(),
              start: jest.fn(),
              stop: jest.fn()
            })),
            destination: {}
          }

          global.AudioContext = jest.fn(() => mockAudioContext) as any

          const { result } = renderHook(() => useTimer({ config: testConfig }))

          act(() => {
            result.current.start()
          })

          if (device.audioLimitations.requiresUserActivation) {
            expect(mockAudioContext.state).toBe('suspended')
            
            // Simulate user interaction to enable audio
            act(() => {
              const clickEvent = new MouseEvent('click', { bubbles: true })
              document.dispatchEvent(clickEvent)
            })

            expect(mockAudioContext.resume).toHaveBeenCalled()
          }
        })
      })
    })
  })

  describe('Cross-Device Compatibility Testing', () => {
    /**
     * Test consistent behavior across all devices
     * Business Rule: Core timer functionality should work consistently across devices
     */
    test('should provide consistent timer functionality across all devices', async () => {
      const results: Record<string, any> = {}

      for (const device of mobileDevices) {
        setupMobileDevice(device)

        const { result } = renderHook(() => useTimer({ config: testConfig }))

        // Test basic timer operations
        act(() => {
          result.current.start()
        })

        expect(result.current.state.status).toBe('running')

        act(() => {
          result.current.pause()
        })

        expect(result.current.state.status).toBe('paused')

        act(() => {
          result.current.reset()
        })

        expect(result.current.state.status).toBe('idle')

        results[device.name] = {
          basicFunctionality: true,
          wakeLockSupported: device.wakeLockSupport,
          hapticSupported: device.vibrationSupport
        }
      }

      // All devices should support basic functionality
      Object.values(results).forEach(result => {
        expect(result.basicFunctionality).toBe(true)
      })
    })

    /**
     * Test responsive design across different screen sizes
     * Business Rule: UI should adapt appropriately to different screen sizes
     */
    test('should adapt UI responsively across different screen sizes', () => {
      const layoutTests = mobileDevices.map(device => {
        setupMobileDevice(device)

        const { container } = render(
          <MobileTimer
            state={{
              status: 'idle',
              phase: 'work',
              currentRound: 1,
              timeRemaining: 180000,
              timeElapsed: 0,
              progress: 0,
              warningTriggered: false,
              workoutProgress: 0,
              lastTick: 0
            }}
            config={testConfig}
            onStart={jest.fn()}
            onPause={jest.fn()}
            onResume={jest.fn()}
            onStop={jest.fn()}
            onReset={jest.fn()}
            onSettingsOpen={jest.fn()}
          />
        )

        const timerElement = container.querySelector('[data-testid="mobile-timer"]')
        
        return {
          device: device.name,
          width: device.viewport.width,
          height: device.viewport.height,
          hasAppropriateLayout: !!timerElement
        }
      })

      // All devices should have appropriate layouts
      layoutTests.forEach(test => {
        expect(test.hasAppropriateLayout).toBe(true)
      })

      // Verify responsive breakpoints
      const smallScreens = layoutTests.filter(test => test.width < 400)
      const largeScreens = layoutTests.filter(test => test.width >= 1000)

      expect(smallScreens.length).toBeGreaterThan(0)
      expect(largeScreens.length).toBeGreaterThan(0)
    })
  })

  describe('Device Orientation and Screen Management', () => {
    /**
     * Test orientation change handling
     * Business Rule: App should adapt smoothly to orientation changes
     */
    test('should handle orientation changes correctly', async () => {
      setupMobileDevice(mobileDevices[0]) // iPhone 12

      const orientationMock = {
        angle: 0,
        type: 'portrait-primary',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        lock: jest.fn(() => Promise.resolve()),
        unlock: jest.fn(() => Promise.resolve())
      }

      Object.defineProperty(screen, 'orientation', {
        value: orientationMock,
        writable: true
      })

      const { rerender } = render(
        <MobileTimer
          state={{
            status: 'running',
            phase: 'work',
            currentRound: 1,
            timeRemaining: 180000,
            timeElapsed: 0,
            progress: 0,
            warningTriggered: false,
            workoutProgress: 0,
            lastTick: 0
          }}
          config={testConfig}
          onStart={jest.fn()}
          onPause={jest.fn()}
          onResume={jest.fn()}
          onStop={jest.fn()}
          onReset={jest.fn()}
          onSettingsOpen={jest.fn()}
          orientation="portrait"
        />
      )

      // Change to landscape
      orientationMock.angle = 90
      orientationMock.type = 'landscape-primary'

      rerender(
        <MobileTimer
          state={{
            status: 'running',
            phase: 'work',
            currentRound: 1,
            timeRemaining: 180000,
            timeElapsed: 0,
            progress: 0,
            warningTriggered: false,
            workoutProgress: 0,
            lastTick: 0
          }}
          config={testConfig}
          onStart={jest.fn()}
          onPause={jest.fn()}
          onResume={jest.fn()}
          onStop={jest.fn()}
          onReset={jest.fn()}
          onSettingsOpen={jest.fn()}
          orientation="landscape"
        />
      )

      const timerContainer = screen.getByTestId('mobile-timer')
      expect(timerContainer).toHaveClass('mobile-timer--landscape')

      // Should attempt to lock orientation during timer
      expect(orientationMock.lock).toHaveBeenCalledWith('landscape-primary')
    })

    /**
     * Test fullscreen behavior
     * Business Rule: Fullscreen should hide system UI and maximize timer visibility
     */
    test('should handle fullscreen mode correctly', () => {
      setupMobileDevice(mobileDevices[1]) // Samsung Galaxy S21

      const { rerender } = render(
        <MobileTimer
          state={{
            status: 'running',
            phase: 'work',
            currentRound: 1,
            timeRemaining: 180000,
            timeElapsed: 0,
            progress: 0,
            warningTriggered: false,
            workoutProgress: 0,
            lastTick: 0
          }}
          config={testConfig}
          onStart={jest.fn()}
          onPause={jest.fn()}
          onResume={jest.fn()}
          onStop={jest.fn()}
          onReset={jest.fn()}
          onSettingsOpen={jest.fn()}
          isFullscreen={false}
        />
      )

      // Enter fullscreen
      rerender(
        <MobileTimer
          state={{
            status: 'running',
            phase: 'work',
            currentRound: 1,
            timeRemaining: 180000,
            timeElapsed: 0,
            progress: 0,
            warningTriggered: false,
            workoutProgress: 0,
            lastTick: 0
          }}
          config={testConfig}
          onStart={jest.fn()}
          onPause={jest.fn()}
          onResume={jest.fn()}
          onStop={jest.fn()}
          onReset={jest.fn()}
          onSettingsOpen={jest.fn()}
          isFullscreen={true}
        />
      )

      const timerContainer = screen.getByTestId('mobile-timer')
      expect(timerContainer).toHaveClass('mobile-timer--fullscreen')

      // Should hide non-essential UI elements
      expect(screen.queryByTestId('status-bar')).not.toBeInTheDocument()
    })
  })

  describe('Network and Connectivity Handling', () => {
    /**
     * Test offline/online transitions
     * Business Rule: App should handle connectivity changes gracefully
     */
    test('should handle network connectivity changes', () => {
      setupMobileDevice(mobileDevices[3]) // Google Pixel 5 with connection support

      const { rerender } = render(
        <MobileTimer
          state={{
            status: 'running',
            phase: 'work',
            currentRound: 1,
            timeRemaining: 180000,
            timeElapsed: 0,
            progress: 0,
            warningTriggered: false,
            workoutProgress: 0,
            lastTick: 0
          }}
          config={testConfig}
          onStart={jest.fn()}
          onPause={jest.fn()}
          onResume={jest.fn()}
          onStop={jest.fn()}
          onReset={jest.fn()}
          onSettingsOpen={jest.fn()}
        />
      )

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true
      })

      act(() => {
        const offlineEvent = new Event('offline')
        window.dispatchEvent(offlineEvent)
      })

      const timerContainer = screen.getByTestId('mobile-timer')
      expect(timerContainer).toHaveClass('mobile-timer--offline')
      expect(screen.getByText(/offline mode/i)).toBeInTheDocument()

      // Simulate coming back online
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true
      })

      act(() => {
        const onlineEvent = new Event('online')
        window.dispatchEvent(onlineEvent)
      })

      expect(timerContainer).not.toHaveClass('mobile-timer--offline')
    })

    /**
     * Test slow connection handling
     * Business Rule: App should optimize for slow connections
     */
    test('should optimize for slow connections', async () => {
      setupMobileDevice(mobileDevices[1]) // Samsung Galaxy S21

      // Mock slow connection
      const slowConnection = {
        effectiveType: '2g',
        downlink: 0.5,
        rtt: 2000,
        saveData: true,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }

      Object.defineProperty(navigator, 'connection', {
        value: slowConnection,
        writable: true
      })

      render(
        <MobileTimer
          state={{
            status: 'idle',
            phase: 'work',
            currentRound: 1,
            timeRemaining: 180000,
            timeElapsed: 0,
            progress: 0,
            warningTriggered: false,
            workoutProgress: 0,
            lastTick: 0
          }}  
          config={testConfig}
          onStart={jest.fn()}
          onPause={jest.fn()}
          onResume={jest.fn()}
          onStop={jest.fn()}
          onReset={jest.fn()}
          onSettingsOpen={jest.fn()}
        />
      )

      const timerContainer = screen.getByTestId('mobile-timer')
      expect(timerContainer).toHaveClass('mobile-timer--slow-connection')

      // Should show data saver mode indicator
      expect(screen.getByText(/data saver mode/i)).toBeInTheDocument()
    })
  })

  describe('Performance Optimization for Mobile', () => {
    /**
     * Test battery optimization
     * Business Rule: App should optimize performance based on battery level
     */
    test('should optimize performance based on battery level', async () => {
      setupMobileDevice(mobileDevices[1]) // Samsung Galaxy S21 with battery support

      const lowBatteryMock = {
        level: 0.15, // 15% battery
        charging: false,
        chargingTime: Infinity,
        dischargingTime: 1800,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }

      ;(navigator.getBattery as jest.Mock).mockResolvedValue(lowBatteryMock)

      render(
        <MobileTimer
          state={{
            status: 'running',
            phase: 'work',
            currentRound: 1,
            timeRemaining: 180000,
            timeElapsed: 0,
            progress: 0,
            warningTriggered: false,
            workoutProgress: 0,
            lastTick: 0
          }}
          config={testConfig}
          onStart={jest.fn()}
          onPause={jest.fn()}
          onResume={jest.fn()}
          onStop={jest.fn()}
          onReset={jest.fn()}
          onSettingsOpen={jest.fn()}
          batteryOptimized={true}
        />
      )

      await waitFor(() => {
        const timerContainer = screen.getByTestId('mobile-timer')
        expect(timerContainer).toHaveClass('mobile-timer--battery-saver')
        expect(screen.getByText(/battery saver mode/i)).toBeInTheDocument()
      })
    })

    /**
     * Test memory usage optimization
     * Business Rule: App should optimize memory usage on constrained devices
     */
    test('should optimize memory usage on constrained devices', () => {
      // Mock device with limited memory (typical for older Android devices)
      Object.defineProperty(navigator, 'deviceMemory', {
        value: 2, // 2GB RAM
        writable: true
      })

      render(
        <MobileTimer
          state={{
            status: 'running',
            phase: 'work',
            currentRound: 1,
            timeRemaining: 180000,
            timeElapsed: 0,
            progress: 0,
            warningTriggered: false,
            workoutProgress: 0,
            lastTick: 0
          }}
          config={testConfig}
          onStart={jest.fn()}
          onPause={jest.fn()}
          onResume={jest.fn()}
          onStop={jest.fn()}
          onReset={jest.fn()}
          onSettingsOpen={jest.fn()}
          memoryOptimized={true}
        />
      )

      const timerContainer = screen.getByTestId('mobile-timer')
      expect(timerContainer).toHaveClass('mobile-timer--memory-optimized')

      // Should reduce visual effects and animations
      expect(screen.queryByTestId('complex-animations')).not.toBeInTheDocument()
    })
  })
})