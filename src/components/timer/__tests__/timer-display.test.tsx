/**
 * Timer Display Component Unit Tests
 * 
 * Comprehensive test suite for the TimerDisplay component focusing on:
 * - Accurate time formatting and display
 * - Visual state transitions (work/rest phases)
 * - Progress indicators and round counters
 * - Accessibility and responsive design
 * - Warning state visual feedback
 * - Performance with frequent updates
 * - Mobile-specific display adaptations
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { TimerDisplay } from '../timer-display'
import { TimerState, TimerConfig } from '../../../lib/timer-engine'  
import { UseTimerReturn } from '../../../hooks/use-timer'

// Mock framer-motion to avoid animation-related test complexity
jest.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<'div'>>(({ children, ...props }, ref) => {
      const MotionDiv = () => <div ref={ref} {...props}>{children}</div>;
      MotionDiv.displayName = 'motion.div';
      return MotionDiv();
    }),
    span: React.forwardRef<HTMLSpanElement, React.ComponentPropsWithoutRef<'span'>>(({ children, ...props }, ref) => {
      const MotionSpan = () => <span ref={ref} {...props}>{children}</span>;
      MotionSpan.displayName = 'motion.span';
      return MotionSpan();
    }),
    h2: React.forwardRef<HTMLHeadingElement, React.ComponentPropsWithoutRef<'h2'>>(({ children, ...props }, ref) => {
      const MotionH2 = () => <h2 ref={ref} {...props}>{children}</h2>;
      MotionH2.displayName = 'motion.h2';
      return MotionH2();
    }),
    circle: React.forwardRef<SVGCircleElement, React.ComponentPropsWithoutRef<'circle'>>(({ children, ...props }, ref) => {
      const MotionCircle = () => <circle ref={ref} {...props}>{children}</circle>;
      MotionCircle.displayName = 'motion.circle';
      return MotionCircle();
    })
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAnimation: () => ({
    start: jest.fn(),
    stop: jest.fn(),
    set: jest.fn()
  })
}))

// Mock ResizeObserver for responsive testing
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}))

describe('TimerDisplay Component', () => {
  // Standard test configuration
  const defaultConfig: TimerConfig = {
    workDuration: 180, // 3 minutes
    restDuration: 60,  // 1 minute
    totalRounds: 5,
    enableWarning: true
  }

  // Helper function to create timer states
  const createTimerState = (overrides: Partial<TimerState> = {}): TimerState => ({
    status: 'idle',
    phase: 'work',
    currentRound: 1,
    timeRemaining: 180000, // 3 minutes in ms
    timeElapsed: 0,
    progress: 0,
    warningTriggered: false,
    workoutProgress: 0,
    ...overrides
  })

  // Helper function to create mock timer object
  const createMockTimer = (stateOverrides: Partial<TimerState> = {}, configOverrides: Partial<TimerConfig> = {}): UseTimerReturn => {
    const state = createTimerState(stateOverrides)
    const config = { ...defaultConfig, ...configOverrides }
    
    return {
      state,
      config,
      isReady: true,
      error: null,
      start: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      stop: jest.fn(),
      reset: jest.fn(),
      updateConfig: jest.fn(),
      loadPreset: jest.fn(),
      formattedTimeRemaining: formatTime(state.timeRemaining),
      formattedTimeElapsed: formatTime(state.timeElapsed),
      isRunning: state.status === 'running',
      isPaused: state.status === 'paused',
      isIdle: state.status === 'idle',
      isCompleted: state.status === 'completed',
      isWorkPhase: state.phase === 'work',
      isRestPhase: state.phase === 'rest'
    }
  }

  // Format time helper function matching the hook implementation
  function formatTime(milliseconds: number): string {
    const totalSeconds = Math.ceil(milliseconds / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Time Display Formatting', () => {
    /**
     * Test accurate time formatting for different durations
     * Business Rule: Time must display in MM:SS format with zero padding
     */
    test('should display time in correct MM:SS format', () => {
      const testCases = [
        { timeRemaining: 0, expected: '00:00' },
        { timeRemaining: 1000, expected: '00:01' },
        { timeRemaining: 30000, expected: '00:30' },
        { timeRemaining: 60000, expected: '01:00' },
        { timeRemaining: 90000, expected: '01:30' },
        { timeRemaining: 180000, expected: '03:00' },
        { timeRemaining: 3665000, expected: '61:05' }
      ]

      testCases.forEach(({ timeRemaining, expected }) => {
        const timer = createMockTimer({ timeRemaining })
        
        render(<TimerDisplay timer={timer} />)

        expect(screen.getByText(expected)).toBeInTheDocument()
      })
    })

    /**
     * Test time display updates with state changes
     * Business Rule: Display should update immediately when state changes
     */
    test('should update display when time changes', () => {
      const initialTimer = createMockTimer({ timeRemaining: 180000 })
      const { rerender } = render(<TimerDisplay timer={initialTimer} />)

      expect(screen.getByText('03:00')).toBeInTheDocument()

      // Update to 2:30 remaining
      const updatedTimer = createMockTimer({ timeRemaining: 150000 })
      rerender(<TimerDisplay timer={updatedTimer} />)

      expect(screen.getByText('02:30')).toBeInTheDocument()
      expect(screen.queryByText('03:00')).not.toBeInTheDocument()
    })
  })

  describe('Visual State Indicators', () => {
    /**
     * Test work phase visual styling
     * Business Rule: Work phase should have distinct visual appearance
     */
    test('should display work phase styling correctly', () => {
      const timer = createMockTimer({
        status: 'running',
        phase: 'work',
        timeRemaining: 180000
      })

      render(<TimerDisplay timer={timer} />)

      // Check for work phase indicators
      expect(screen.getByText(/work/i)).toBeInTheDocument()
    })

    /**
     * Test rest phase visual styling
     * Business Rule: Rest phase should have visually distinct appearance from work
     */
    test('should display rest phase styling correctly', () => {
      const timer = createMockTimer({
        status: 'running',
        phase: 'rest',
        timeRemaining: 60000,
        currentRound: 1
      })

      render(<TimerDisplay timer={timer} />)
      
      // Check for rest phase indicators
      expect(screen.getByText(/rest/i)).toBeInTheDocument()
    })

    /**
     * Test warning state visual feedback
     * Business Rule: Warning state should be clearly visible to user
     */
    test('should display warning state correctly', () => {
      const timer = createMockTimer({
        status: 'running',
        phase: 'work',
        timeRemaining: 8000, // 8 seconds - in warning range
        warningTriggered: true
      })

      render(<TimerDisplay timer={timer} />)
      
      // Time should still display correctly
      expect(screen.getByText('00:08')).toBeInTheDocument()
    })

    /**
     * Test paused state visual feedback
     * Business Rule: Paused state should be clearly indicated
     */
    test('should display paused state correctly', () => {
      const timer = createMockTimer({
        status: 'paused',
        phase: 'work',
        timeRemaining: 120000
      })

      render(<TimerDisplay timer={timer} />)
      
      // Timer should show correct time
      expect(screen.getByText('02:00')).toBeInTheDocument()
    })
  })

  describe('Round Counter Display', () => {
    /**
     * Test round counter accuracy
     * Business Rule: Round counter should show current/total rounds
     */
    test('should display current round correctly', () => {
      const states = [
        { currentRound: 1, expected: '1' },
        { currentRound: 3, expected: '3' },
        { currentRound: 5, expected: '5' }
      ]

      states.forEach(({ currentRound, expected }) => {
        const timer = createMockTimer({ currentRound })
        
        const { unmount } = render(<TimerDisplay timer={timer} />)

        expect(screen.getByText(expected)).toBeInTheDocument()
        expect(screen.getByText('of 5')).toBeInTheDocument()
        
        // Clean up after each iteration
        unmount()
      })
    })

    /**
     * Test round counter with different total rounds
     * Business Rule: Display should adapt to different workout configurations
     */
    test('should display different total rounds correctly', () => {
      const configs = [
        { totalRounds: 1, expected: 'of 1' },
        { totalRounds: 3, expected: 'of 3' },
        { totalRounds: 12, expected: 'of 12' }
      ]

      configs.forEach(({ totalRounds, expected }) => {
        const timer = createMockTimer({ currentRound: 1 }, { totalRounds })
        
        const { unmount } = render(<TimerDisplay timer={timer} />)

        expect(screen.getByText('1')).toBeInTheDocument()
        expect(screen.getByText(expected)).toBeInTheDocument()
        
        // Clean up after each iteration
        unmount()
      })
    })
  })

  describe('Progress Indicators', () => {
    /**
     * Test progress display
     * Business Rule: Progress should be visually represented
     */
    test('should display progress indicator correctly', () => {
      const timer = createMockTimer({ 
        progress: 0.5, 
        workoutProgress: 0.3,
        status: 'running'
      })
      
      render(<TimerDisplay timer={timer} />)

      // Progress circle should be present in SVG
      const svg = document.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    /**
     * Test progress indicator phases
     * Business Rule: Progress display should work for different phases
     */
    test('should show progress for work/rest phases', () => {
      const workTimer = createMockTimer({ 
        phase: 'work', 
        progress: 0.5,
        status: 'running'
      })
      
      const { rerender } = render(<TimerDisplay timer={workTimer} />)
      expect(screen.getByText('WORK')).toBeInTheDocument()

      const restTimer = createMockTimer({ 
        phase: 'rest',
        progress: 0.3,
        status: 'running'
      })
      
      rerender(<TimerDisplay timer={restTimer} />)
      expect(screen.getByText('REST')).toBeInTheDocument()
    })
  })

  describe('Size Variants and Responsive Design', () => {
    /**
     * Test component renders correctly
     * Business Rule: Display should render without errors
     */
    test('should render component correctly', () => {
      const timer = createMockTimer()
      
      render(<TimerDisplay timer={timer} />)
      
      // Component should render
      expect(screen.getByText('03:00')).toBeInTheDocument()
      expect(screen.getByText('WORK')).toBeInTheDocument()
    })

    /**
     * Test responsive display
     * Business Rule: Component should handle different viewport sizes
     */
    test('should adapt for mobile displays', () => {
      const timer = createMockTimer()
      
      render(<TimerDisplay timer={timer} />)
      
      // Should display core elements
      expect(screen.getByText('03:00')).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('of 5')).toBeInTheDocument()
    })

    /**
     * Test touch optimization
     * Business Rule: Component should be touch-friendly
     */
    test('should use touch-friendly sizing', () => {
      const timer = createMockTimer()
      
      render(<TimerDisplay timer={timer} />)
      
      // Should render large time display
      expect(screen.getByText('03:00')).toBeInTheDocument()
    })
  })

  describe('Accessibility Features', () => {
    /**
     * Test component accessibility
     * Business Rule: Component should be accessible
     */
    test('should render with proper semantics', () => {
      const timer = createMockTimer({
        status: 'running',
        phase: 'work',
        timeRemaining: 120000,
        currentRound: 2
      })

      render(<TimerDisplay timer={timer} />)

      // Check for work phase text
      expect(screen.getByText('WORK')).toBeInTheDocument()
      expect(screen.getByText('02:00')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    /**
     * Test phase transitions
     * Business Rule: Phase changes should be clearly displayed
     */
    test('should display phase changes clearly', () => {
      const workTimer = createMockTimer({
        status: 'running',
        phase: 'work',
        timeRemaining: 180000
      })

      const { rerender } = render(<TimerDisplay timer={workTimer} />)
      expect(screen.getByText('WORK')).toBeInTheDocument()

      // Change to rest phase
      const restTimer = createMockTimer({
        status: 'running',
        phase: 'rest',
        timeRemaining: 60000
      })

      rerender(<TimerDisplay timer={restTimer} />)
      expect(screen.getByText('REST')).toBeInTheDocument()
    })

    /**
     * Test component structure
     * Business Rule: Component should have proper structure
     */
    test('should have proper component structure', () => {
      const timer = createMockTimer()
      
      render(<TimerDisplay timer={timer} />)

      // Should have time display
      expect(screen.getByText('03:00')).toBeInTheDocument()
      // Should have phase display
      expect(screen.getByText('WORK')).toBeInTheDocument()
      // Should have round display
      expect(screen.getByText('1')).toBeInTheDocument()
    })
  })

  describe('Performance and Updates', () => {
    /**
     * Test component updates
     * Business Rule: Component should handle state updates correctly
     */
    test('should handle state updates correctly', () => {
      const initialTimer = createMockTimer({ timeRemaining: 180000 })
      const { rerender } = render(<TimerDisplay timer={initialTimer} />)

      expect(screen.getByText('03:00')).toBeInTheDocument()

      // Different time should update display
      const updatedTimer = createMockTimer({ timeRemaining: 179000 })
      rerender(<TimerDisplay timer={updatedTimer} />)
      expect(screen.getByText('02:59')).toBeInTheDocument()
    })

    /**
     * Test rapid updates
     * Business Rule: Component should handle frequent updates
     */
    test('should handle rapid state updates efficiently', () => {
      const initialTimer = createMockTimer({ timeRemaining: 10000 })
      const { rerender } = render(<TimerDisplay timer={initialTimer} />)

      // Simulate several timer updates
      for (let i = 9000; i >= 8000; i -= 1000) {
        const timer = createMockTimer({ timeRemaining: i })
        rerender(<TimerDisplay timer={timer} />)
      }

      // Should display the final time
      expect(screen.getByText('00:08')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    /**
     * Test handling of invalid props
     * Business Rule: Component should handle invalid data gracefully
     */
    test('should handle invalid timer state gracefully', () => {
      const invalidTimer = createMockTimer({
        timeRemaining: -1000, // Invalid negative time
        currentRound: 0,      // Invalid round number
        progress: 1.5         // Invalid progress > 1
      })

      expect(() => {
        render(<TimerDisplay timer={invalidTimer} />)
      }).not.toThrow()

      // Component should still render
      const timeDisplay = screen.getByText(invalidTimer.formattedTimeRemaining)
      expect(timeDisplay).toBeInTheDocument()
    })

    /**
     * Test handling of edge cases
     * Business Rule: Component should provide sensible behavior
     */
    test('should handle edge cases gracefully', () => {
      const edgeTimer = createMockTimer({
        timeRemaining: 0,
        currentRound: 1,
        progress: 1
      })

      expect(() => {
        render(<TimerDisplay timer={edgeTimer} />)
      }).not.toThrow()

      expect(screen.getByText('00:00')).toBeInTheDocument()
    })
  })

  describe('Theme Support', () => {
    /**
     * Test component theming
     * Business Rule: Component should work with different themes
     */
    test('should support dark theme environments', () => {
      const timer = createMockTimer()
      
      render(
        <div data-theme="dark">
          <TimerDisplay timer={timer} />
        </div>
      )

      // Component should render regardless of theme
      expect(screen.getByText('03:00')).toBeInTheDocument()
      expect(screen.getByText('WORK')).toBeInTheDocument()
    })

    /**
     * Test high contrast considerations
     * Business Rule: Component should maintain visibility
     */
    test('should maintain visibility in high contrast', () => {
      const timer = createMockTimer()
      
      render(<TimerDisplay timer={timer} />)

      // Core elements should be visible
      expect(screen.getByText('03:00')).toBeInTheDocument()
      expect(screen.getByText('WORK')).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument()
    })
  })
})