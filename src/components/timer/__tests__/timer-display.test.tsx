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
import { render, screen, waitFor } from '@testing-library/react'
import { TimerDisplay } from '../timer-display'
import { TimerState, TimerConfig } from '../../../lib/timer-engine'

// Mock framer-motion to avoid animation-related test complexity
jest.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef<HTMLDivElement, any>(({ children, ...props }, ref) => (
      <div ref={ref} {...props}>{children}</div>
    )),
    span: React.forwardRef<HTMLSpanElement, any>(({ children, ...props }, ref) => (
      <span ref={ref} {...props}>{children}</span>
    ))
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
    lastTick: 0,
    ...overrides
  })

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
        const state = createTimerState({ timeRemaining })
        
        render(
          <TimerDisplay 
            state={state} 
            config={defaultConfig}
            size="large"
          />
        )

        expect(screen.getByText(expected)).toBeInTheDocument()
      })
    })

    /**
     * Test time display updates with state changes
     * Business Rule: Display should update immediately when state changes
     */
    test('should update display when time changes', () => {
      const initialState = createTimerState({ timeRemaining: 180000 })
      const { rerender } = render(
        <TimerDisplay 
          state={initialState} 
          config={defaultConfig}
          size="large"
        />
      )

      expect(screen.getByText('03:00')).toBeInTheDocument()

      // Update to 2:30 remaining
      const updatedState = createTimerState({ timeRemaining: 150000 })
      rerender(
        <TimerDisplay 
          state={updatedState} 
          config={defaultConfig}
          size="large"
        />
      )

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
      const workState = createTimerState({
        status: 'running',
        phase: 'work',
        timeRemaining: 180000
      })

      render(
        <TimerDisplay 
          state={workState} 
          config={defaultConfig}
          size="large"
        />
      )

      const container = screen.getByTestId('timer-display')
      expect(container).toHaveClass('timer-display--work')
      expect(container).not.toHaveClass('timer-display--rest')
      
      // Check for work phase indicators
      expect(screen.getByText(/work/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/work phase/i)).toBeInTheDocument()
    })

    /**
     * Test rest phase visual styling
     * Business Rule: Rest phase should have visually distinct appearance from work
     */
    test('should display rest phase styling correctly', () => {
      const restState = createTimerState({
        status: 'running',
        phase: 'rest',
        timeRemaining: 60000,
        currentRound: 1
      })

      render(
        <TimerDisplay 
          state={restState} 
          config={defaultConfig}
          size="large"
        />
      )

      const container = screen.getByTestId('timer-display')
      expect(container).toHaveClass('timer-display--rest')
      expect(container).not.toHaveClass('timer-display--work')
      
      // Check for rest phase indicators
      expect(screen.getByText(/rest/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/rest phase/i)).toBeInTheDocument()
    })

    /**
     * Test warning state visual feedback
     * Business Rule: Warning state should be clearly visible to user
     */
    test('should display warning state correctly', () => {
      const warningState = createTimerState({
        status: 'running',
        phase: 'work',
        timeRemaining: 8000, // 8 seconds - in warning range
        warningTriggered: true
      })

      render(
        <TimerDisplay 
          state={warningState} 
          config={defaultConfig}
          size="large"
        />
      )

      const container = screen.getByTestId('timer-display')
      expect(container).toHaveClass('timer-display--warning')
      
      // Check for warning visual indicators
      expect(screen.getByLabelText(/warning/i)).toBeInTheDocument()
      
      // Time should still display correctly
      expect(screen.getByText('00:08')).toBeInTheDocument()
    })

    /**
     * Test paused state visual feedback
     * Business Rule: Paused state should be clearly indicated
     */
    test('should display paused state correctly', () => {
      const pausedState = createTimerState({
        status: 'paused',
        phase: 'work',
        timeRemaining: 120000
      })

      render(
        <TimerDisplay 
          state={pausedState} 
          config={defaultConfig}
          size="large"
        />
      )

      const container = screen.getByTestId('timer-display')
      expect(container).toHaveClass('timer-display--paused')
      
      // Check for paused indicators
      expect(screen.getByText(/paused/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/paused/i)).toBeInTheDocument()
    })
  })

  describe('Round Counter Display', () => {
    /**
     * Test round counter accuracy
     * Business Rule: Round counter should show current/total rounds
     */
    test('should display current round correctly', () => {
      const states = [
        { currentRound: 1, expected: 'Round 1 of 5' },
        { currentRound: 3, expected: 'Round 3 of 5' },
        { currentRound: 5, expected: 'Round 5 of 5' }
      ]

      states.forEach(({ currentRound, expected }) => {
        const state = createTimerState({ currentRound })
        
        render(
          <TimerDisplay 
            state={state} 
            config={defaultConfig}
            size="large"
          />
        )

        expect(screen.getByText(expected)).toBeInTheDocument()
      })
    })

    /**
     * Test round counter with different total rounds
     * Business Rule: Display should adapt to different workout configurations
     */
    test('should display different total rounds correctly', () => {
      const configs = [
        { totalRounds: 1, expected: 'Round 1 of 1' },
        { totalRounds: 3, expected: 'Round 1 of 3' },
        { totalRounds: 12, expected: 'Round 1 of 12' }
      ]

      configs.forEach(({ totalRounds, expected }) => {
        const config = { ...defaultConfig, totalRounds }
        const state = createTimerState({ currentRound: 1 })
        
        render(
          <TimerDisplay 
            state={state} 
            config={config}
            size="large"
          />
        )

        expect(screen.getByText(expected)).toBeInTheDocument()
      })
    })
  })

  describe('Progress Indicators', () => {
    /**
     * Test circular progress indicator
     * Business Rule: Progress should visually represent workout completion
     */
    test('should display progress indicator correctly', () => {
      const progressStates = [
        { progress: 0, workoutProgress: 0 },
        { progress: 0.25, workoutProgress: 0.1 },
        { progress: 0.5, workoutProgress: 0.3 },
        { progress: 0.75, workoutProgress: 0.6 },
        { progress: 1, workoutProgress: 1 }
      ]

      progressStates.forEach(({ progress, workoutProgress }) => {
        const state = createTimerState({ progress, workoutProgress })
        
        render(
          <TimerDisplay 
            state={state} 
            config={defaultConfig}
            size="large"
            showProgress={true}
          />
        )

        // Check for progress circle
        const progressCircle = screen.getByRole('progressbar')
        expect(progressCircle).toBeInTheDocument()
        expect(progressCircle).toHaveAttribute('aria-valuenow', String(Math.round(progress * 100)))
        
        // Check for workout progress indicator
        const workoutProgressText = screen.getByText(`${Math.round(workoutProgress * 100)}%`)
        expect(workoutProgressText).toBeInTheDocument()
      })
    })

    /**
     * Test progress indicator phases
     * Business Rule: Progress color should reflect current phase
     */
    test('should show different progress colors for work/rest phases', () => {
      const workState = createTimerState({ 
        phase: 'work', 
        progress: 0.5,
        status: 'running'
      })
      
      const { rerender } = render(
        <TimerDisplay 
          state={workState} 
          config={defaultConfig}
          size="large"
          showProgress={true}
        />
      )

      const workProgress = screen.getByRole('progressbar')
      expect(workProgress).toHaveClass('progress--work')

      const restState = createTimerState({ 
        phase: 'rest',
        progress: 0.3,
        status: 'running'
      })
      
      rerender(
        <TimerDisplay 
          state={restState} 
          config={defaultConfig}
          size="large"
          showProgress={true}
        />
      )

      const restProgress = screen.getByRole('progressbar')
      expect(restProgress).toHaveClass('progress--rest')
    })
  })

  describe('Size Variants and Responsive Design', () => {
    /**
     * Test different display sizes
     * Business Rule: Display should adapt to different size requirements
     */
    test('should render different size variants correctly', () => {
      const sizes = ['small', 'medium', 'large'] as const
      const state = createTimerState()

      sizes.forEach(size => {
        render(
          <TimerDisplay 
            state={state} 
            config={defaultConfig}
            size={size}
          />
        )

        const container = screen.getByTestId('timer-display')
        expect(container).toHaveClass(`timer-display--${size}`)
      })
    })

    /**
     * Test mobile-specific adaptations
     * Business Rule: Mobile displays should be optimized for smaller screens
     */
    test('should adapt for mobile displays', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375 // iPhone width
      })

      const state = createTimerState()
      
      render(
        <TimerDisplay 
          state={state} 
          config={defaultConfig}
          size="large"
          isMobile={true}
        />
      )

      const container = screen.getByTestId('timer-display')
      expect(container).toHaveClass('timer-display--mobile')
      
      // Mobile should show simplified layout
      expect(screen.queryByText(/workout progress/i)).not.toBeInTheDocument()
    })

    /**
     * Test touch-friendly sizing
     * Business Rule: Touch interfaces need larger interactive elements
     */
    test('should use touch-friendly sizing', () => {
      const state = createTimerState()
      
      render(
        <TimerDisplay 
          state={state} 
          config={defaultConfig}
          size="large"
          touchOptimized={true}
        />
      )

      const timeDisplay = screen.getByTestId('time-display')
      
      // Should have larger font size for touch devices
      expect(timeDisplay).toHaveClass('text-display--touch')
    })
  })

  describe('Accessibility Features', () => {
    /**
     * Test ARIA labels and roles
     * Business Rule: Component must be accessible to screen readers
     */
    test('should have proper ARIA labels', () => {
      const state = createTimerState({
        status: 'running',
        phase: 'work',
        timeRemaining: 120000,
        currentRound: 2
      })

      render(
        <TimerDisplay 
          state={state} 
          config={defaultConfig}
          size="large"
        />
      )

      // Check main timer role and label
      expect(screen.getByRole('timer')).toBeInTheDocument()
      expect(screen.getByLabelText(/boxing timer/i)).toBeInTheDocument()
      
      // Check phase announcement
      expect(screen.getByLabelText(/work phase/i)).toBeInTheDocument()
      
      // Check time announcement
      expect(screen.getByLabelText(/2 minutes remaining/i)).toBeInTheDocument()
      
      // Check round announcement
      expect(screen.getByLabelText(/round 2 of 5/i)).toBeInTheDocument()
    })

    /**
     * Test screen reader announcements
     * Business Rule: Important state changes should be announced
     */
    test('should announce state changes to screen readers', () => {
      const initialState = createTimerState({
        status: 'running',
        phase: 'work',
        timeRemaining: 180000
      })

      const { rerender } = render(
        <TimerDisplay 
          state={initialState} 
          config={defaultConfig}
          size="large"
        />
      )

      // Change to rest phase
      const restState = createTimerState({
        status: 'running',
        phase: 'rest',
        timeRemaining: 60000
      })

      rerender(
        <TimerDisplay 
          state={restState} 
          config={defaultConfig}
          size="large"
        />
      )

      // Should announce phase change
      expect(screen.getByRole('status')).toHaveTextContent(/rest phase started/i)
    })

    /**
     * Test keyboard navigation support
     * Business Rule: Component should be navigable via keyboard
     */
    test('should support keyboard navigation', () => {
      const state = createTimerState()
      
      render(
        <TimerDisplay 
          state={state} 
          config={defaultConfig}
          size="large"
          focusable={true}
        />
      )

      const container = screen.getByTestId('timer-display')
      expect(container).toHaveAttribute('tabIndex', '0')
      expect(container).toHaveAttribute('role', 'timer')
    })
  })

  describe('Performance and Updates', () => {
    /**
     * Test efficient re-rendering
     * Business Rule: Component should only re-render when necessary
     */
    test('should minimize unnecessary re-renders', () => {
      const renderSpy = jest.fn()
      
      const TestWrapper = ({ state }: { state: TimerState }) => {
        renderSpy()
        return (
          <TimerDisplay 
            state={state} 
            config={defaultConfig}
            size="large"
          />
        )
      }

      const initialState = createTimerState({ timeRemaining: 180000 })
      const { rerender } = render(<TestWrapper state={initialState} />)

      // Same state should not cause re-render
      rerender(<TestWrapper state={initialState} />)
      expect(renderSpy).toHaveBeenCalledTimes(2) // Initial + same state

      // Different time should cause re-render
      const updatedState = createTimerState({ timeRemaining: 179000 })
      rerender(<TestWrapper state={updatedState} />)
      expect(renderSpy).toHaveBeenCalledTimes(3)
    })

    /**
     * Test animation performance
     * Business Rule: Animations should not impact timer accuracy
     */
    test('should handle rapid state updates efficiently', async () => {
      const initialState = createTimerState({ timeRemaining: 10000 })
      const { rerender } = render(
        <TimerDisplay 
          state={initialState} 
          config={defaultConfig}
          size="large"
        />
      )

      // Simulate rapid timer updates (like real timer ticks)
      const startTime = performance.now()
      
      for (let i = 9000; i >= 0; i -= 100) {
        const state = createTimerState({ timeRemaining: i })
        rerender(
          <TimerDisplay 
            state={state} 
            config={defaultConfig}
            size="large"
          />
        )
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      // Should complete updates quickly (under 100ms for 90 updates)
      expect(duration).toBeLessThan(100)
    })
  })

  describe('Error Handling', () => {
    /**
     * Test handling of invalid props
     * Business Rule: Component should handle invalid data gracefully
     */
    test('should handle invalid timer state gracefully', () => {
      const invalidState = {
        ...createTimerState(),
        timeRemaining: -1000, // Invalid negative time
        currentRound: 0,      // Invalid round number
        progress: 1.5         // Invalid progress > 1
      }

      expect(() => {
        render(
          <TimerDisplay 
            state={invalidState} 
            config={defaultConfig}
            size="large"
          />
        )
      }).not.toThrow()

      // Should display safe fallback values
      expect(screen.getByText('00:00')).toBeInTheDocument()
      expect(screen.getByText(/round 1/i)).toBeInTheDocument()
    })

    /**
     * Test handling of undefined or null props
     * Business Rule: Component should provide sensible defaults
     */
    test('should handle missing props gracefully', () => {
      expect(() => {
        render(
          <TimerDisplay 
            state={createTimerState()}
            config={defaultConfig}
            size={undefined as any}
          />
        )
      }).not.toThrow()

      // Should default to medium size
      const container = screen.getByTestId('timer-display')
      expect(container).toHaveClass('timer-display--medium')
    })
  })

  describe('Theme Support', () => {
    /**
     * Test dark mode support
     * Business Rule: Component should support theme switching
     */
    test('should support dark mode styling', () => {
      const state = createTimerState()
      
      render(
        <div data-theme="dark">
          <TimerDisplay 
            state={state} 
            config={defaultConfig}
            size="large"
          />
        </div>
      )

      const container = screen.getByTestId('timer-display')
      expect(container).toHaveClass('timer-display--dark')
    })

    /**
     * Test high contrast mode
     * Business Rule: Component should support accessibility themes
     */
    test('should support high contrast mode', () => {
      const state = createTimerState()
      
      render(
        <TimerDisplay 
          state={state} 
          config={defaultConfig}
          size="large"
          highContrast={true}
        />
      )

      const container = screen.getByTestId('timer-display')
      expect(container).toHaveClass('timer-display--high-contrast')
    })
  })
})