/**
 * useMobileGestures Hook Unit Tests
 * 
 * Comprehensive test suite for the useMobileGestures hook focusing on:
 * - Touch gesture recognition (swipe, tap, long press, pinch)
 * - Gesture callback handling and event delegation
 * - Touch event optimization and performance
 * - Multi-touch gesture support
 * - Gesture cancellation and error handling
 * - Cross-browser touch event compatibility
 * - Accessibility considerations for touch interfaces
 */

import { renderHook, act } from '@testing-library/react'
import { useMobileGestures, GestureConfig, GestureCallbacks } from '../use-mobile-gestures'

// Mock touch events
const createMockTouch = (id: number, x: number, y: number) => ({
  identifier: id,
  clientX: x,
  clientY: y,
  pageX: x,
  pageY: y,
  screenX: x,
  screenY: y,
  target: document.body,
  radiusX: 0,
  radiusY: 0,
  rotationAngle: 0,
  force: 1
})

const createTouchEvent = (
  type: string,
  touches: Array<{ id: number; x: number; y: number }>,
  element?: HTMLElement
) => {
  const touchList = touches.map(({ id, x, y }) => createMockTouch(id, x, y))
  
  const event = new TouchEvent(type, {
    touches: touchList,
    targetTouches: touchList,
    changedTouches: touchList,
    bubbles: true,
    cancelable: true
  })

  Object.defineProperty(event, 'target', {
    value: element || document.body,
    writable: false
  })

  return event
}

// Mock performance timing
const mockPerformanceNow = jest.fn()
global.performance.now = mockPerformanceNow

describe('useMobileGestures Hook', () => {
  let mockElement: HTMLElement
  let currentTime = 0

  const defaultCallbacks: GestureCallbacks = {
    onSwipeLeft: jest.fn(),
    onSwipeRight: jest.fn(),
    onSwipeUp: jest.fn(),
    onSwipeDown: jest.fn(),
    onTap: jest.fn(),
    onDoubleTap: jest.fn(),
    onLongPress: jest.fn(),
    onPinchStart: jest.fn(),
    onPinchMove: jest.fn(),
    onPinchEnd: jest.fn()
  }

  const defaultConfig: GestureConfig = {
    swipeThreshold: 50,
    longPressDelay: 800,
    doubleTapDelay: 300,
    pinchThreshold: 10,
    preventDefaults: true,
    enableHapticFeedback: false
  }

  beforeEach(() => {
    jest.clearAllMocks()
    currentTime = 0
    mockPerformanceNow.mockImplementation(() => currentTime)

    // Create mock element
    mockElement = document.createElement('div')
    mockElement.getBoundingClientRect = jest.fn(() => ({
      x: 0,
      y: 0,
      width: 300,
      height: 400,
      top: 0,
      left: 0,
      right: 300,
      bottom: 400
    }))

    // Mock element methods
    mockElement.addEventListener = jest.fn()
    mockElement.removeEventListener = jest.fn()

    document.body.appendChild(mockElement)
  })

  afterEach(() => {
    document.body.removeChild(mockElement)
    jest.useRealTimers()
  })

  describe('Hook Initialization and Cleanup', () => {
    /**
     * Test hook initialization with element ref
     * Business Rule: Hook should attach touch event listeners to target element
     */
    test('should initialize with element ref and attach listeners', () => {
      const ref = { current: mockElement }
      
      renderHook(() => 
        useMobileGestures(ref, defaultCallbacks, defaultConfig)
      )

      // Should attach touch event listeners
      expect(mockElement.addEventListener).toHaveBeenCalledWith(
        'touchstart',
        expect.any(Function),
        { passive: false }
      )
      expect(mockElement.addEventListener).toHaveBeenCalledWith(
        'touchmove',
        expect.any(Function),
        { passive: false }
      )
      expect(mockElement.addEventListener).toHaveBeenCalledWith(
        'touchend',
        expect.any(Function),
        { passive: false }
      )
      expect(mockElement.addEventListener).toHaveBeenCalledWith(
        'touchcancel',
        expect.any(Function),
        { passive: false }
      )
    })

    /**
     * Test hook cleanup on unmount
     * Business Rule: Hook should remove event listeners to prevent memory leaks
     */
    test('should cleanup event listeners on unmount', () => {
      const ref = { current: mockElement }
      
      const { unmount } = renderHook(() => 
        useMobileGestures(ref, defaultCallbacks, defaultConfig)
      )

      unmount()

      // Should remove touch event listeners
      expect(mockElement.removeEventListener).toHaveBeenCalledWith(
        'touchstart',
        expect.any(Function)
      )
      expect(mockElement.removeEventListener).toHaveBeenCalledWith(
        'touchmove',
        expect.any(Function)
      )
      expect(mockElement.removeEventListener).toHaveBeenCalledWith(
        'touchend',
        expect.any(Function)
      )
      expect(mockElement.removeEventListener).toHaveBeenCalledWith(
        'touchcancel',
        expect.any(Function)
      )
    })

    /**
     * Test handling of null element ref
     * Business Rule: Hook should handle null/undefined refs gracefully
     */
    test('should handle null element ref gracefully', () => {
      const ref = { current: null }
      
      expect(() => {
        renderHook(() => 
          useMobileGestures(ref, defaultCallbacks, defaultConfig)
        )
      }).not.toThrow()
    })

    /**
     * Test dynamic element ref changes
     * Business Rule: Hook should adapt to ref changes
     */
    test('should handle element ref changes', () => {
      const newElement = document.createElement('div')
      newElement.addEventListener = jest.fn()
      newElement.removeEventListener = jest.fn()

      const ref = { current: mockElement }
      
      const { rerender } = renderHook(() => 
        useMobileGestures(ref, defaultCallbacks, defaultConfig)
      )

      // Change ref to new element
      ref.current = newElement
      rerender()

      // Should remove listeners from old element
      expect(mockElement.removeEventListener).toHaveBeenCalled()
      
      // Should add listeners to new element
      expect(newElement.addEventListener).toHaveBeenCalled()
    })
  })

  describe('Swipe Gesture Recognition', () => {
    /**
     * Test horizontal swipe detection
     * Business Rule: Horizontal swipes should trigger appropriate callbacks
     */
    test('should detect horizontal swipe gestures', () => {
      const ref = { current: mockElement }
      
      renderHook(() => 
        useMobileGestures(ref, defaultCallbacks, defaultConfig)
      )

      // Get the actual event handler
      const touchStartHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchstart')[1]
      const touchMoveHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchmove')[1]
      const touchEndHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchend')[1]

      // Test swipe right
      currentTime = 100
      touchStartHandler(createTouchEvent('touchstart', [{ id: 1, x: 50, y: 200 }]))
      
      currentTime = 200
      touchMoveHandler(createTouchEvent('touchmove', [{ id: 1, x: 150, y: 200 }]))
      
      currentTime = 250
      touchEndHandler(createTouchEvent('touchend', []))

      expect(defaultCallbacks.onSwipeRight).toHaveBeenCalledWith({
        startX: 50,
        startY: 200,
        endX: 150,
        endY: 200,
        deltaX: 100,
        deltaY: 0,
        distance: 100,
        duration: 150,
        velocity: expect.any(Number)
      })

      // Reset mocks
      jest.clearAllMocks()

      // Test swipe left
      currentTime = 300
      touchStartHandler(createTouchEvent('touchstart', [{ id: 1, x: 200, y: 200 }]))
      
      currentTime = 400
      touchMoveHandler(createTouchEvent('touchmove', [{ id: 1, x: 100, y: 200 }]))
      
      currentTime = 450
      touchEndHandler(createTouchEvent('touchend', []))

      expect(defaultCallbacks.onSwipeLeft).toHaveBeenCalledWith({
        startX: 200,
        startY: 200,
        endX: 100,
        endY: 200,
        deltaX: -100,
        deltaY: 0,
        distance: 100,
        duration: 150,
        velocity: expect.any(Number)
      })
    })

    /**
     * Test vertical swipe detection
     * Business Rule: Vertical swipes should trigger appropriate callbacks
     */
    test('should detect vertical swipe gestures', () => {
      const ref = { current: mockElement }
      
      renderHook(() => 
        useMobileGestures(ref, defaultCallbacks, defaultConfig)
      )

      const touchStartHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchstart')[1]
      const touchMoveHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchmove')[1]
      const touchEndHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchend')[1]

      // Test swipe up
      currentTime = 100
      touchStartHandler(createTouchEvent('touchstart', [{ id: 1, x: 150, y: 250 }]))
      
      currentTime = 200
      touchMoveHandler(createTouchEvent('touchmove', [{ id: 1, x: 150, y: 150 }]))
      
      currentTime = 250
      touchEndHandler(createTouchEvent('touchend', []))

      expect(defaultCallbacks.onSwipeUp).toHaveBeenCalledWith({
        startX: 150,
        startY: 250,
        endX: 150,
        endY: 150,
        deltaX: 0,
        deltaY: -100,
        distance: 100,
        duration: 150,
        velocity: expect.any(Number)
      })

      // Reset mocks
      jest.clearAllMocks()

      // Test swipe down
      currentTime = 300
      touchStartHandler(createTouchEvent('touchstart', [{ id: 1, x: 150, y: 100 }]))
      
      currentTime = 400
      touchMoveHandler(createTouchEvent('touchmove', [{ id: 1, x: 150, y: 200 }]))
      
      currentTime = 450
      touchEndHandler(createTouchEvent('touchend', []))

      expect(defaultCallbacks.onSwipeDown).toHaveBeenCalledWith({
        startX: 150,
        startY: 100,
        endX: 150,
        endY: 200,
        deltaX: 0,
        deltaY: 100,
        distance: 100,
        duration: 150,
        velocity: expect.any(Number)
      })
    })

    /**
     * Test swipe threshold enforcement
     * Business Rule: Swipes below threshold should not trigger callbacks
     */
    test('should not trigger swipe for movements below threshold', () => {
      const ref = { current: mockElement }
      
      renderHook(() => 
        useMobileGestures(ref, defaultCallbacks, defaultConfig)
      )

      const touchStartHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchstart')[1]
      const touchMoveHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchmove')[1]
      const touchEndHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchend')[1]

      // Test movement below threshold (30px when threshold is 50px)
      currentTime = 100
      touchStartHandler(createTouchEvent('touchstart', [{ id: 1, x: 150, y: 200 }]))
      
      currentTime = 200
      touchMoveHandler(createTouchEvent('touchmove', [{ id: 1, x: 180, y: 200 }]))
      
      currentTime = 250
      touchEndHandler(createTouchEvent('touchend', []))

      // Should not trigger any swipe callbacks
      expect(defaultCallbacks.onSwipeRight).not.toHaveBeenCalled()
      expect(defaultCallbacks.onSwipeLeft).not.toHaveBeenCalled()
      expect(defaultCallbacks.onSwipeUp).not.toHaveBeenCalled()
      expect(defaultCallbacks.onSwipeDown).not.toHaveBeenCalled()
    })

    /**
     * Test diagonal swipe prioritization
     * Business Rule: Diagonal swipes should prioritize the dominant direction
     */
    test('should prioritize dominant direction for diagonal swipes', () => {
      const ref = { current: mockElement }
      
      renderHook(() => 
        useMobileGestures(ref, defaultCallbacks, defaultConfig)
      )

      const touchStartHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchstart')[1]
      const touchMoveHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchmove')[1]
      const touchEndHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchend')[1]

      // Test diagonal swipe with horizontal dominance
      currentTime = 100
      touchStartHandler(createTouchEvent('touchstart', [{ id: 1, x: 100, y: 200 }]))
      
      currentTime = 200
      touchMoveHandler(createTouchEvent('touchmove', [{ id: 1, x: 200, y: 230 }])) // 100px horizontal, 30px vertical
      
      currentTime = 250
      touchEndHandler(createTouchEvent('touchend', []))

      // Should trigger horizontal swipe (dominant direction)
      expect(defaultCallbacks.onSwipeRight).toHaveBeenCalled()
      expect(defaultCallbacks.onSwipeDown).not.toHaveBeenCalled()
    })
  })

  describe('Tap Gesture Recognition', () => {
    /**
     * Test single tap detection
     * Business Rule: Quick touch and release should trigger tap callback
     */
    test('should detect single tap gestures', () => {
      const ref = { current: mockElement }
      
      renderHook(() => 
        useMobileGestures(ref, defaultCallbacks, defaultConfig)
      )

      const touchStartHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchstart')[1]
      const touchEndHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchend')[1]

      // Test single tap
      currentTime = 100
      touchStartHandler(createTouchEvent('touchstart', [{ id: 1, x: 150, y: 200 }]))
      
      currentTime = 200
      touchEndHandler(createTouchEvent('touchend', []))

      expect(defaultCallbacks.onTap).toHaveBeenCalledWith({
        x: 150,
        y: 200,
        timestamp: 200,
        duration: 100
      })
    })

    /**
     * Test double tap detection
     * Business Rule: Two quick taps should trigger double tap callback
     */
    test('should detect double tap gestures', async () => {
      jest.useFakeTimers()
      const ref = { current: mockElement }
      
      renderHook(() => 
        useMobileGestures(ref, defaultCallbacks, defaultConfig)
      )

      const touchStartHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchstart')[1]
      const touchEndHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchend')[1]

      // First tap
      currentTime = 100
      touchStartHandler(createTouchEvent('touchstart', [{ id: 1, x: 150, y: 200 }]))
      
      currentTime = 150
      touchEndHandler(createTouchEvent('touchend', []))

      // Second tap within double tap delay
      currentTime = 250
      touchStartHandler(createTouchEvent('touchstart', [{ id: 1, x: 150, y: 200 }]))
      
      currentTime = 300
      touchEndHandler(createTouchEvent('touchend', []))

      // Should trigger double tap
      expect(defaultCallbacks.onDoubleTap).toHaveBeenCalledWith({
        x: 150,
        y: 200,
        timestamp: 300,
        timeBetweenTaps: 100
      })

      // Should not trigger single tap for second tap
      expect(defaultCallbacks.onTap).toHaveBeenCalledTimes(1) // Only first tap
    })

    /**
     * Test tap cancellation on movement
     * Business Rule: Taps should be cancelled if finger moves too much
     */
    test('should cancel tap on excessive movement', () => {
      const ref = { current: mockElement }
      
      renderHook(() => 
        useMobileGestures(ref, defaultCallbacks, defaultConfig)
      )

      const touchStartHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchstart')[1]
      const touchMoveHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchmove')[1]
      const touchEndHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchend')[1]

      // Start potential tap
      currentTime = 100
      touchStartHandler(createTouchEvent('touchstart', [{ id: 1, x: 150, y: 200 }]))
      
      // Move finger significantly (should cancel tap)
      currentTime = 150
      touchMoveHandler(createTouchEvent('touchmove', [{ id: 1, x: 200, y: 200 }]))
      
      currentTime = 200
      touchEndHandler(createTouchEvent('touchend', []))

      // Should not trigger tap due to movement
      expect(defaultCallbacks.onTap).not.toHaveBeenCalled()
    })
  })

  describe('Long Press Gesture Recognition', () => {
    /**
     * Test long press detection
     * Business Rule: Holding touch for specified duration should trigger long press
     */
    test('should detect long press gestures', () => {
      jest.useFakeTimers()
      const ref = { current: mockElement }
      
      renderHook(() => 
        useMobileGestures(ref, defaultCallbacks, defaultConfig)
      )

      const touchStartHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchstart')[1]
      const touchEndHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchend')[1]

      // Start long press
      currentTime = 100
      touchStartHandler(createTouchEvent('touchstart', [{ id: 1, x: 150, y: 200 }]))

      // Fast-forward to long press threshold
      jest.advanceTimersByTime(800) // defaultConfig.longPressDelay
      currentTime = 900

      expect(defaultCallbacks.onLongPress).toHaveBeenCalledWith({
        x: 150,
        y: 200,
        timestamp: 900,
        duration: 800
      })

      // End touch
      touchEndHandler(createTouchEvent('touchend', []))

      // Should not trigger tap after long press
      expect(defaultCallbacks.onTap).not.toHaveBeenCalled()
    })

    /**
     * Test long press cancellation
     * Business Rule: Long press should be cancelled if finger is lifted early
     */
    test('should cancel long press if touch ends early', () => {
      jest.useFakeTimers()
      const ref = { current: mockElement }
      
      renderHook(() => 
        useMobileGestures(ref, defaultCallbacks, defaultConfig)
      )

      const touchStartHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchstart')[1]
      const touchEndHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchend')[1]

      // Start potential long press
      currentTime = 100
      touchStartHandler(createTouchEvent('touchstart', [{ id: 1, x: 150, y: 200 }]))

      // End touch before long press threshold
      jest.advanceTimersByTime(400)
      currentTime = 500
      touchEndHandler(createTouchEvent('touchend', []))

      // Fast-forward past long press threshold
      jest.advanceTimersByTime(400)

      // Should not trigger long press
      expect(defaultCallbacks.onLongPress).not.toHaveBeenCalled()
      
      // Should trigger regular tap
      expect(defaultCallbacks.onTap).toHaveBeenCalled()
    })

    /**
     * Test long press cancellation on movement
     * Business Rule: Long press should be cancelled if finger moves too much
     */
    test('should cancel long press on excessive movement', () => {
      jest.useFakeTimers()
      const ref = { current: mockElement }
      
      renderHook(() => 
        useMobileGestures(ref, defaultCallbacks, defaultConfig)
      )

      const touchStartHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchstart')[1]
      const touchMoveHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchmove')[1]

      // Start long press
      currentTime = 100
      touchStartHandler(createTouchEvent('touchstart', [{ id: 1, x: 150, y: 200 }]))

      // Move finger significantly during long press
      jest.advanceTimersByTime(400)
      currentTime = 500
      touchMoveHandler(createTouchEvent('touchmove', [{ id: 1, x: 200, y: 200 }]))

      // Continue to long press threshold
      jest.advanceTimersByTime(400)

      // Should not trigger long press due to movement
      expect(defaultCallbacks.onLongPress).not.toHaveBeenCalled()
    })
  })

  describe('Pinch Gesture Recognition', () => {
    /**
     * Test pinch gesture detection
     * Business Rule: Two-finger pinch gestures should be recognized
     */
    test('should detect pinch gestures', () => {
      const ref = { current: mockElement }
      
      renderHook(() => 
        useMobileGestures(ref, defaultCallbacks, defaultConfig)
      )

      const touchStartHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchstart')[1]
      const touchMoveHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchmove')[1]
      const touchEndHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchend')[1]

      // Start pinch with two fingers
      currentTime = 100
      touchStartHandler(createTouchEvent('touchstart', [
        { id: 1, x: 100, y: 200 },
        { id: 2, x: 200, y: 200 }
      ]))

      expect(defaultCallbacks.onPinchStart).toHaveBeenCalledWith({
        centerX: 150,
        centerY: 200,
        distance: 100,
        timestamp: 100
      })

      // Move fingers to simulate pinch
      currentTime = 200
      touchMoveHandler(createTouchEvent('touchmove', [
        { id: 1, x: 110, y: 200 },
        { id: 2, x: 190, y: 200 }
      ]))

      expect(defaultCallbacks.onPinchMove).toHaveBeenCalledWith({
        centerX: 150,
        centerY: 200,
        distance: 80,
        scale: 0.8, // 80/100
        deltaScale: -0.2,
        timestamp: 200
      })

      // End pinch
      touchEndHandler(createTouchEvent('touchend', []))

      expect(defaultCallbacks.onPinchEnd).toHaveBeenCalledWith({
        centerX: 150,
        centerY: 200,
        finalScale: 0.8,
        duration: 100,
        timestamp: 200
      })
    })

    /**
     * Test pinch threshold enforcement
     * Business Rule: Pinch should only trigger if distance change exceeds threshold
     */
    test('should not trigger pinch for small distance changes', () => {
      const ref = { current: mockElement }
      
      renderHook(() => 
        useMobileGestures(ref, defaultCallbacks, defaultConfig)
      )

      const touchStartHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchstart')[1]
      const touchMoveHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchmove')[1]

      // Start with two fingers
      currentTime = 100
      touchStartHandler(createTouchEvent('touchstart', [
        { id: 1, x: 100, y: 200 },
        { id: 2, x: 200, y: 200 }
      ]))

      // Move fingers by small amount (below threshold)
      currentTime = 200
      touchMoveHandler(createTouchEvent('touchmove', [
        { id: 1, x: 102, y: 200 },
        { id: 2, x: 198, y: 200 }
      ]))

      // Should trigger start but not move (distance change too small)
      expect(defaultCallbacks.onPinchStart).toHaveBeenCalled()
      expect(defaultCallbacks.onPinchMove).not.toHaveBeenCalled()
    })
  })

  describe('Performance and Optimization', () => {
    /**
     * Test touch event optimization
     * Business Rule: Touch events should be optimized for performance
     */
    test('should optimize touch event handling', () => {
      const ref = { current: mockElement }
      
      renderHook(() => 
        useMobileGestures(ref, defaultCallbacks, {
          ...defaultConfig,
          optimizePerformance: true
        })
      )

      // Should use passive listeners when appropriate
      const addEventListenerCalls = (mockElement.addEventListener as jest.Mock).mock.calls
      const touchMoveCall = addEventListenerCalls.find(call => call[0] === 'touchmove')
      
      expect(touchMoveCall[2]).toEqual({ passive: false })
    })

    /**
     * Test gesture debouncing
     * Business Rule: Rapid gestures should be debounced to prevent excessive callbacks
     */
    test('should debounce rapid gesture events', () => {
      jest.useFakeTimers()
      const ref = { current: mockElement }
      
      renderHook(() => 
        useMobileGestures(ref, defaultCallbacks, {
          ...defaultConfig,
          debounceDelay: 100
        })
      )

      const touchStartHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchstart')[1]
      const touchEndHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchend')[1]

      // Rapid taps
      for (let i = 0; i < 5; i++) {
        currentTime = i * 50
        touchStartHandler(createTouchEvent('touchstart', [{ id: 1, x: 150, y: 200 }]))
        touchEndHandler(createTouchEvent('touchend', []))
      }

      jest.advanceTimersByTime(100)

      // Should debounce and only call once
      expect(defaultCallbacks.onTap).toHaveBeenCalledTimes(1)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    /**
     * Test handling of touch cancel events
     * Business Rule: Touch cancel should reset gesture state
     */
    test('should handle touch cancel events', () => {
      const ref = { current: mockElement }
      
      renderHook(() => 
        useMobileGestures(ref, defaultCallbacks, defaultConfig)
      )

      const touchStartHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchstart')[1]
      const touchCancelHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchcancel')[1]

      // Start gesture
      currentTime = 100
      touchStartHandler(createTouchEvent('touchstart', [{ id: 1, x: 150, y: 200 }]))

      // Cancel gesture
      const cancelEvent = createTouchEvent('touchcancel', [])
      touchCancelHandler(cancelEvent)

      // Should reset gesture state and not trigger callbacks
      expect(defaultCallbacks.onTap).not.toHaveBeenCalled()
      expect(defaultCallbacks.onLongPress).not.toHaveBeenCalled()
    })

    /**
     * Test handling of invalid touch data
     * Business Rule: Invalid touch data should not crash the hook
     */
    test('should handle invalid touch data gracefully', () => {
      const ref = { current: mockElement }
      
      renderHook(() => 
        useMobileGestures(ref, defaultCallbacks, defaultConfig)
      )

      const touchStartHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchstart')[1]

      // Create event with invalid touch data
      const invalidEvent = new TouchEvent('touchstart', {
        touches: [] // Empty touches array
      })

      expect(() => {
        touchStartHandler(invalidEvent)
      }).not.toThrow()
    })

    /**
     * Test callback error handling
     * Business Rule: Errors in gesture callbacks should not crash the hook
     */
    test('should handle callback errors gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error')
      })

      const errorCallbacks = {
        ...defaultCallbacks,
        onTap: errorCallback
      }

      const ref = { current: mockElement }
      
      renderHook(() => 
        useMobileGestures(ref, errorCallbacks, defaultConfig)
      )

      const touchStartHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchstart')[1]
      const touchEndHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchend')[1]

      expect(() => {
        currentTime = 100
        touchStartHandler(createTouchEvent('touchstart', [{ id: 1, x: 150, y: 200 }]))
        
        currentTime = 200
        touchEndHandler(createTouchEvent('touchend', []))
      }).not.toThrow()

      expect(errorCallback).toHaveBeenCalled()
    })
  })

  describe('Accessibility Considerations', () => {
    /**
     * Test haptic feedback integration
     * Business Rule: Gestures should provide haptic feedback when enabled
     */
    test('should provide haptic feedback for gestures', () => {
      const mockVibrate = jest.fn()
      Object.defineProperty(navigator, 'vibrate', {
        value: mockVibrate,
        writable: true
      })

      const ref = { current: mockElement }
      
      renderHook(() => 
        useMobileGestures(ref, defaultCallbacks, {
          ...defaultConfig,
          enableHapticFeedback: true
        })
      )

      const touchStartHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchstart')[1]
      const touchEndHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchend')[1]

      // Perform tap
      currentTime = 100
      touchStartHandler(createTouchEvent('touchstart', [{ id: 1, x: 150, y: 200 }]))
      
      currentTime = 200
      touchEndHandler(createTouchEvent('touchend', []))

      expect(mockVibrate).toHaveBeenCalledWith([10]) // Short vibration for tap
    })

    /**
     * Test gesture accessibility announcements
     * Business Rule: Important gestures should be announced to screen readers
     */
    test('should announce gestures for accessibility', () => {
      const ref = { current: mockElement }
      
      const accessibleCallbacks = {
        ...defaultCallbacks,
        onAnnounce: jest.fn()
      }
      
      renderHook(() => 
        useMobileGestures(ref, accessibleCallbacks, {
          ...defaultConfig,
          enableAccessibilityAnnouncements: true
        })
      )

      const touchStartHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchstart')[1]
      const touchEndHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchend')[1]

      // Perform double tap
      currentTime = 100
      touchStartHandler(createTouchEvent('touchstart', [{ id: 1, x: 150, y: 200 }]))
      touchEndHandler(createTouchEvent('touchend', []))

      currentTime = 200
      touchStartHandler(createTouchEvent('touchstart', [{ id: 1, x: 150, y: 200 }]))
      touchEndHandler(createTouchEvent('touchend', []))

      expect(accessibleCallbacks.onAnnounce).toHaveBeenCalledWith('Double tap detected')
    })
  })
})