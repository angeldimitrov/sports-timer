/**
 * Mobile Timer Component Unit Tests
 * 
 * Comprehensive test suite for mobile-optimized timer components focusing on:
 * - Touch-friendly interface design and interaction
 * - Mobile-specific gestures (swipe, pinch, tap)
 * - Screen orientation handling (portrait/landscape)
 * - Mobile browser limitations and workarounds
 * - Wake lock API integration for screen staying on
 * - PWA-specific functionality and offline behavior
 * - Performance optimization for mobile devices
 * - Mobile accessibility and screen reader support
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MobileTimer } from '../mobile-timer'
import { TimerState, TimerConfig } from '../../../lib/timer-engine'

// Mock mobile-specific APIs
const mockWakeLock = {
  request: jest.fn(() => Promise.resolve({
    release: jest.fn(() => Promise.resolve())
  })),
  type: 'screen'
}

const mockScreen = {
  orientation: {
    angle: 0,
    type: 'portrait-primary',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    lock: jest.fn(() => Promise.resolve()),
    unlock: jest.fn(() => Promise.resolve())
  }
}

// Mock navigator APIs
Object.defineProperty(navigator, 'wakeLock', {
  value: mockWakeLock,
  writable: true
})

Object.defineProperty(screen, 'orientation', {
  value: mockScreen.orientation,
  writable: true
})

// Mock touch events
const createTouchEvent = (type: string, touches: Array<{ clientX: number; clientY: number }>) => {
  return new TouchEvent(type, {
    touches: touches.map(touch => ({
      ...touch,
      identifier: Math.random(),
      target: document.body,
      radiusX: 0,
      radiusY: 0,
      rotationAngle: 0,
      force: 1
    })) as any
  })
}

describe('MobileTimer Component', () => {
  // Mock callback functions
  const mockOnStart = jest.fn()
  const mockOnPause = jest.fn()
  const mockOnResume = jest.fn()
  const mockOnStop = jest.fn()
  const mockOnReset = jest.fn()
  const mockOnSettingsOpen = jest.fn()

  const defaultConfig: TimerConfig = {
    workDuration: 180,
    restDuration: 60,
    totalRounds: 5,
    enableWarning: true
  }

  const createTimerState = (overrides: Partial<TimerState> = {}): TimerState => ({
    status: 'idle',
    phase: 'work',
    currentRound: 1,
    timeRemaining: 180000,
    timeElapsed: 0,
    progress: 0,
    warningTriggered: false,
    workoutProgress: 0,
    lastTick: 0,
    ...overrides
  })

  const defaultProps = {
    state: createTimerState(),
    config: defaultConfig,
    onStart: mockOnStart,
    onPause: mockOnPause,
    onResume: mockOnResume,
    onStop: mockOnStop,
    onReset: mockOnReset,
    onSettingsOpen: mockOnSettingsOpen,
    orientation: 'portrait' as const,
    isFullscreen: false,
    wakeLockEnabled: true
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset viewport
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true })
    Object.defineProperty(window, 'innerHeight', { value: 667, writable: true })
  })

  describe('Mobile Layout and Responsive Design', () => {
    /**
     * Test mobile-optimized layout structure
     * Business Rule: Mobile timer should maximize screen real estate
     */
    test('should render mobile-optimized layout', () => {
      render(<MobileTimer {...defaultProps} />)

      const container = screen.getByTestId('mobile-timer')
      expect(container).toHaveClass('mobile-timer')
      expect(container).toHaveClass('mobile-timer--portrait')

      // Should have full-height layout
      expect(container).toHaveClass('h-screen')
      
      // Timer display should be large and prominent
      const timerDisplay = screen.getByTestId('mobile-timer-display')
      expect(timerDisplay).toHaveClass('timer-display--mobile-large')
    })

    /**
     * Test landscape orientation adaptation
     * Business Rule: Landscape mode should reorganize layout for better usability
     */
    test('should adapt layout for landscape orientation', () => {
      const landscapeProps = {
        ...defaultProps,
        orientation: 'landscape' as const
      }

      render(<MobileTimer {...landscapeProps} />)

      const container = screen.getByTestId('mobile-timer')
      expect(container).toHaveClass('mobile-timer--landscape')

      // Controls should be arranged horizontally in landscape
      const controls = screen.getByTestId('mobile-controls')
      expect(controls).toHaveClass('controls--landscape')
    })

    /**
     * Test fullscreen mode
     * Business Rule: Fullscreen should hide system UI elements
     */
    test('should handle fullscreen mode', () => {
      const fullscreenProps = {
        ...defaultProps,
        isFullscreen: true
      }

      render(<MobileTimer {...fullscreenProps} />)

      const container = screen.getByTestId('mobile-timer')
      expect(container).toHaveClass('mobile-timer--fullscreen')

      // Should hide non-essential UI elements
      expect(screen.queryByTestId('status-bar')).not.toBeInTheDocument()
      expect(screen.queryByTestId('navigation-header')).not.toBeInTheDocument()
    })

    /**
     * Test different mobile screen sizes
     * Business Rule: Layout should adapt to various mobile device dimensions
     */
    test('should handle different mobile screen sizes', () => {
      const screenSizes = [
        { width: 320, height: 568, name: 'iPhone SE' },
        { width: 375, height: 667, name: 'iPhone 8' },
        { width: 414, height: 896, name: 'iPhone 11' },
        { width: 360, height: 640, name: 'Android Medium' }
      ]

      screenSizes.forEach(({ width, height }) => {
        // Update viewport
        Object.defineProperty(window, 'innerWidth', { value: width, writable: true })
        Object.defineProperty(window, 'innerHeight', { value: height, writable: true })

        const { container } = render(<MobileTimer {...defaultProps} />)

        // Should apply appropriate size class
        if (width <= 320) {
          expect(container.firstChild).toHaveClass('mobile-timer--small')
        } else if (width >= 414) {
          expect(container.firstChild).toHaveClass('mobile-timer--large')
        } else {
          expect(container.firstChild).toHaveClass('mobile-timer--medium')
        }
      })
    })
  })

  describe('Touch Interactions and Gestures', () => {
    /**
     * Test touch-friendly button sizing
     * Business Rule: All touch targets should be minimum 44px for accessibility
     */
    test('should have touch-friendly button sizes', () => {
      render(<MobileTimer {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button)
        
        // Should meet minimum touch target size
        expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(44)
        expect(parseInt(styles.minWidth)).toBeGreaterThanOrEqual(44)
        
        // Should have touch-friendly padding
        expect(button).toHaveClass('touch-target')
      })
    })

    /**
     * Test swipe gestures for timer control
     * Business Rule: Swipe right = start/resume, swipe left = pause, swipe up = stop
     */
    test('should handle swipe gestures for timer control', async () => {
      render(<MobileTimer {...defaultProps} />)

      const timerDisplay = screen.getByTestId('mobile-timer-display')

      // Test swipe right to start
      fireEvent(timerDisplay, createTouchEvent('touchstart', [{ clientX: 50, clientY: 300 }]))
      fireEvent(timerDisplay, createTouchEvent('touchmove', [{ clientX: 150, clientY: 300 }]))
      fireEvent(timerDisplay, createTouchEvent('touchend', []))

      await waitFor(() => {
        expect(mockOnStart).toHaveBeenCalledTimes(1)
      })

      // Test swipe left to pause (with running state)
      const runningState = createTimerState({ status: 'running' })
      render(<MobileTimer {...defaultProps} state={runningState} />)
      
      fireEvent(timerDisplay, createTouchEvent('touchstart', [{ clientX: 200, clientY: 300 }]))
      fireEvent(timerDisplay, createTouchEvent('touchmove', [{ clientX: 100, clientY: 300 }]))
      fireEvent(timerDisplay, createTouchEvent('touchend', []))

      await waitFor(() => {
        expect(mockOnPause).toHaveBeenCalledTimes(1)
      })
    })

    /**
     * Test tap-to-wake functionality
     * Business Rule: Tapping timer display should prevent screen sleep
     */
    test('should handle tap-to-wake functionality', async () => {
      render(<MobileTimer {...defaultProps} />)

      const timerDisplay = screen.getByTestId('mobile-timer-display')
      
      // Single tap should request wake lock
      fireEvent.touchStart(timerDisplay)
      fireEvent.touchEnd(timerDisplay)

      await waitFor(() => {
        expect(mockWakeLock.request).toHaveBeenCalledWith('screen')
      })
    })

    /**
     * Test pinch-to-zoom prevention
     * Business Rule: Pinch gestures should be prevented to avoid accidental zooming
     */
    test('should prevent pinch-to-zoom gestures', () => {
      render(<MobileTimer {...defaultProps} />)

      const container = screen.getByTestId('mobile-timer')

      // Test pinch gesture
      const pinchEvent = createTouchEvent('touchstart', [
        { clientX: 100, clientY: 200 },
        { clientX: 150, clientY: 250 }
      ])

      const preventDefaultSpy = jest.fn()
      pinchEvent.preventDefault = preventDefaultSpy

      fireEvent(container, pinchEvent)

      expect(preventDefaultSpy).toHaveBeenCalled()
    })

    /**
     * Test long press for settings access
     * Business Rule: Long press on timer should open settings
     */
    test('should handle long press for settings access', async () => {
      jest.useFakeTimers()
      render(<MobileTimer {...defaultProps} />)

      const timerDisplay = screen.getByTestId('mobile-timer-display')

      // Start long press
      fireEvent.touchStart(timerDisplay)

      // Wait for long press threshold (800ms)
      jest.advanceTimersByTime(800)

      fireEvent.touchEnd(timerDisplay)

      await waitFor(() => {
        expect(mockOnSettingsOpen).toHaveBeenCalledTimes(1)
      })

      jest.useRealTimers()
    })

    /**
     * Test double-tap prevention
     * Business Rule: Double-taps should be debounced to prevent accidental actions
     */
    test('should prevent double-tap actions', async () => {
      jest.useFakeTimers()
      render(<MobileTimer {...defaultProps} />)

      const startButton = screen.getByRole('button', { name: /start/i })

      // Rapid double-tap
      fireEvent.touchStart(startButton)
      fireEvent.touchEnd(startButton)
      fireEvent.touchStart(startButton)
      fireEvent.touchEnd(startButton)

      // Should only trigger once due to debouncing
      expect(mockOnStart).toHaveBeenCalledTimes(1)

      jest.useRealTimers()
    })
  })

  describe('Screen Orientation and Display', () => {
    /**
     * Test automatic orientation lock
     * Business Rule: Running timer should lock to current orientation
     */
    test('should lock orientation when timer is running', async () => {
      const runningState = createTimerState({ status: 'running' })
      
      render(<MobileTimer {...defaultProps} state={runningState} />)

      await waitFor(() => {
        expect(mockScreen.orientation.lock).toHaveBeenCalledWith('portrait-primary')
      })
    })

    /**
     * Test orientation change handling
     * Business Rule: Layout should adapt smoothly to orientation changes
     */
    test('should handle orientation changes gracefully', () => {
      render(<MobileTimer {...defaultProps} />)

      // Simulate orientation change to landscape
      const orientationChangeEvent = new Event('orientationchange')
      mockScreen.orientation.angle = 90
      mockScreen.orientation.type = 'landscape-primary'

      fireEvent(window, orientationChangeEvent)

      rerender(<MobileTimer {...defaultProps} orientation="landscape" />)

      const container = screen.getByTestId('mobile-timer')
      expect(container).toHaveClass('mobile-timer--landscape')
    })

    /**
     * Test status bar behavior
     * Business Rule: Status bar should be hidden in fullscreen mode
     */
    test('should handle status bar in fullscreen', () => {
      const metaViewport = document.querySelector('meta[name="viewport"]')
      const originalContent = metaViewport?.getAttribute('content')

      render(<MobileTimer {...defaultProps} isFullscreen={true} />)

      // Should update viewport meta tag for fullscreen
      expect(metaViewport?.getAttribute('content')).toContain('viewport-fit=cover')

      // Clean up
      if (originalContent && metaViewport) {
        metaViewport.setAttribute('content', originalContent)
      }
    })
  })

  describe('Wake Lock and Screen Management', () => {
    /**
     * Test wake lock activation
     * Business Rule: Running timer should keep screen on
     */
    test('should request wake lock when timer starts', async () => {
      const idleState = createTimerState({ status: 'idle' })
      const runningState = createTimerState({ status: 'running' })

      render(<MobileTimer {...defaultProps} state={idleState} />)

      // Start timer
      rerender(<MobileTimer {...defaultProps} state={runningState} />)

      await waitFor(() => {
        expect(mockWakeLock.request).toHaveBeenCalledWith('screen')
      })
    })

    /**
     * Test wake lock release
     * Business Rule: Wake lock should be released when timer stops
     */
    test('should release wake lock when timer stops', async () => {
      const mockWakeLockInstance = {
        release: jest.fn(() => Promise.resolve())
      }
      mockWakeLock.request.mockResolvedValue(mockWakeLockInstance)

      const runningState = createTimerState({ status: 'running' })
      const idleState = createTimerState({ status: 'idle' })

      render(<MobileTimer {...defaultProps} state={runningState} />)

      // Stop timer
      rerender(<MobileTimer {...defaultProps} state={idleState} />)

      await waitFor(() => {
        expect(mockWakeLockInstance.release).toHaveBeenCalled()
      })
    })

    /**
     * Test wake lock error handling
     * Business Rule: Wake lock failures should not crash the timer
     */
    test('should handle wake lock errors gracefully', async () => {
      mockWakeLock.request.mockRejectedValue(new Error('Wake lock not supported'))

      const runningState = createTimerState({ status: 'running' })
      
      expect(() => {
        render(<MobileTimer {...defaultProps} state={runningState} />)
      }).not.toThrow()

      // Timer should still function without wake lock
      expect(screen.getByTestId('mobile-timer')).toBeInTheDocument()
    })

    /**
     * Test visibility change handling
     * Business Rule: Timer should handle app backgrounding/foregrounding
     */
    test('should handle visibility changes', () => {
      const runningState = createTimerState({ status: 'running' })
      render(<MobileTimer {...defaultProps} state={runningState} />)

      // Simulate app going to background
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true
      })
      fireEvent(document, new Event('visibilitychange'))

      // Timer should remain in running state but may pause wake lock
      const container = screen.getByTestId('mobile-timer')
      expect(container).toHaveClass('mobile-timer--backgrounded')

      // Simulate app returning to foreground
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true
      })
      fireEvent(document, new Event('visibilitychange'))

      expect(container).not.toHaveClass('mobile-timer--backgrounded')
    })
  })

  describe('Performance Optimization', () => {
    /**
     * Test efficient rendering with frequent updates
     * Business Rule: Mobile rendering should be optimized for battery life
     */
    test('should optimize rendering for mobile performance', async () => {
      const renderSpy = jest.fn()
      
      const OptimizedTimer = ({ state }: { state: TimerState }) => {
        renderSpy()
        return <MobileTimer {...defaultProps} state={state} />
      }

      const initialState = createTimerState({ timeRemaining: 10000 })
      render(<OptimizedTimer state={initialState} />)

      // Simulate rapid timer updates
      for (let i = 9900; i >= 0; i -= 100) {
        const state = createTimerState({ timeRemaining: i })
        rerender(<OptimizedTimer state={state} />)
      }

      // Should limit re-renders using throttling
      expect(renderSpy).toBeLessThan(50) // Less than total updates
    })

    /**
     * Test touch event optimization
     * Business Rule: Touch events should be optimized to prevent performance issues
     */
    test('should optimize touch event handling', () => {
      render(<MobileTimer {...defaultProps} />)

      const timerDisplay = screen.getByTestId('mobile-timer-display')
      
      // Touch events should use passive listeners for better scroll performance
      const touchListeners = (timerDisplay as any)._touchListeners
      expect(touchListeners?.passive).toBe(true)
    })

    /**
     * Test memory management
     * Business Rule: Component should clean up resources when unmounted
     */
    test('should clean up resources on unmount', () => {
      const mockWakeLockInstance = {
        release: jest.fn(() => Promise.resolve())
      }
      mockWakeLock.request.mockResolvedValue(mockWakeLockInstance)

      const runningState = createTimerState({ status: 'running' })
      const { unmount } = render(<MobileTimer {...defaultProps} state={runningState} />)

      unmount()

      // Should release wake lock and remove event listeners
      expect(mockWakeLockInstance.release).toHaveBeenCalled()
      expect(mockScreen.orientation.removeEventListener).toHaveBeenCalled()
    })
  })

  describe('Mobile Accessibility', () => {
    /**
     * Test voice control support
     * Business Rule: Timer should support voice commands on mobile
     */
    test('should support voice control commands', async () => {
      const mockSpeechRecognition = {
        start: jest.fn(),
        stop: jest.fn(),
        onresult: null,
        onerror: null
      }

      // Mock speech recognition API
      global.webkitSpeechRecognition = jest.fn(() => mockSpeechRecognition) as any

      render(<MobileTimer {...defaultProps} enableVoiceControl={true} />)

      // Voice command should trigger actions
      const speechEvent = {
        results: [[{ transcript: 'start timer', confidence: 0.9 }]]
      }

      if (mockSpeechRecognition.onresult) {
        mockSpeechRecognition.onresult(speechEvent as any)
      }

      await waitFor(() => {
        expect(mockOnStart).toHaveBeenCalledTimes(1)
      })
    })

    /**
     * Test haptic feedback
     * Business Rule: Mobile devices should provide haptic feedback for timer events
     */
    test('should provide haptic feedback for timer events', async () => {
      const mockVibrate = jest.fn()
      Object.defineProperty(navigator, 'vibrate', {
        value: mockVibrate,
        writable: true
      })

      const runningState = createTimerState({ status: 'running' })
      render(<MobileTimer {...defaultProps} />)

      // Transition to running should trigger haptic feedback
      rerender(<MobileTimer {...defaultProps} state={runningState} />)

      await waitFor(() => {
        expect(mockVibrate).toHaveBeenCalledWith([100]) // Short vibration
      })
    })

    /**
     * Test screen reader optimization
     * Business Rule: Mobile screen readers should receive optimized announcements
     */
    test('should optimize announcements for mobile screen readers', async () => {
      render(<MobileTimer {...defaultProps} />)

      const liveRegion = screen.getByRole('status')
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true')
      expect(liveRegion).toHaveAttribute('aria-live', 'polite')

      // Time updates should be announced appropriately for mobile
      const runningState = createTimerState({ 
        status: 'running',
        timeRemaining: 10000 // 10 seconds
      })

      render(<MobileTimer {...defaultProps} state={runningState} />)
      
      // Should announce in mobile-friendly format
      expect(liveRegion).toHaveTextContent(/10 seconds remaining/i)
    })

    /**
     * Test high contrast mode for mobile
     * Business Rule: Mobile timer should support high contrast themes
     */
    test('should support mobile high contrast mode', () => {
      render(
        <div data-theme="high-contrast">
          <MobileTimer {...defaultProps} />
        </div>
      )

      const container = screen.getByTestId('mobile-timer')
      expect(container).toHaveClass('mobile-timer--high-contrast')

      // Text should have enhanced contrast for mobile viewing
      const timeDisplay = screen.getByTestId('mobile-timer-display')
      expect(timeDisplay).toHaveClass('high-contrast-mobile')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    /**
     * Test handling of unsupported mobile features
     * Business Rule: Timer should degrade gracefully on limited mobile browsers
     */
    test('should handle unsupported mobile features gracefully', () => {
      // Remove wake lock support
      delete (navigator as Navigator & { wakeLock?: WakeLock }).wakeLock

      // Remove orientation support
      delete (screen as Screen & { orientation?: ScreenOrientation }).orientation

      expect(() => {
        render(<MobileTimer {...defaultProps} />)
      }).not.toThrow()

      // Should show fallback UI for unsupported features
      expect(screen.getByText(/some features may be limited/i)).toBeInTheDocument()
    })

    /**
     * Test network connectivity handling
     * Business Rule: Timer should work offline and handle connectivity changes
     */
    test('should handle network connectivity changes', () => {
      // Simulate offline mode
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true
      })

      render(<MobileTimer {...defaultProps} />)

      const container = screen.getByTestId('mobile-timer')
      expect(container).toHaveClass('mobile-timer--offline')

      // Should show offline indicator
      expect(screen.getByText(/offline mode/i)).toBeInTheDocument()

      // Simulate coming back online
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true
      })

      fireEvent(window, new Event('online'))

      expect(container).not.toHaveClass('mobile-timer--offline')
    })

    /**
     * Test battery level awareness
     * Business Rule: Timer should adapt behavior based on battery level
     */
    test('should adapt to low battery conditions', async () => {
      const mockBattery = {
        level: 0.15, // 15% battery
        charging: false,
        addEventListener: jest.fn()
      }

      // Mock battery API
      ;(navigator as Navigator & { getBattery?: () => Promise<{ level: number }> }).getBattery = jest.fn(() => Promise.resolve(mockBattery))

      render(<MobileTimer {...defaultProps} batteryOptimized={true} />)

      await waitFor(() => {
        const container = screen.getByTestId('mobile-timer')
        expect(container).toHaveClass('mobile-timer--battery-saver')
      })

      // Should show battery saving notification
      expect(screen.getByText(/battery saver mode/i)).toBeInTheDocument()
    })
  })
})