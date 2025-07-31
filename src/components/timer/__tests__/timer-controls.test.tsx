/**
 * Timer Controls Component Unit Tests
 * 
 * Comprehensive test suite for the TimerControls component focusing on:
 * - Control button functionality (start, pause, stop, reset)
 * - State-dependent button visibility and disabled states
 * - Keyboard shortcuts and accessibility
 * - Touch-friendly interaction design
 * - Error handling and edge cases
 * - Visual feedback and loading states
 * - Integration with timer state management
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TimerControls } from '../timer-controls'
import { TimerState, TimerConfig } from '../../../lib/timer-engine'

// Mock sound effects for button interactions
const mockPlaySound = jest.fn()
jest.mock('../../../lib/audio-manager', () => ({
  getAudioManager: () => ({
    play: mockPlaySound,
    isReady: () => true
  })
}))

describe('TimerControls Component', () => {
  // Mock callback functions
  const mockOnStart = jest.fn()
  const mockOnPause = jest.fn()
  const mockOnResume = jest.fn()
  const mockOnStop = jest.fn()
  const mockOnReset = jest.fn()

  // Standard test configuration
  const defaultConfig: TimerConfig = {
    workDuration: 180,
    restDuration: 60,
    totalRounds: 5,
    enableWarning: true
  }

  // Helper function to create timer states
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

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Control Button Visibility and States', () => {
    /**
     * Test button visibility in idle state
     * Business Rule: In idle state, only start button should be available
     */
    test('should show start button in idle state', () => {
      const idleState = createTimerState({ status: 'idle' })

      render(
        <TimerControls
          state={idleState}
          config={defaultConfig}
          onStart={mockOnStart}
          onPause={mockOnPause}
          onResume={mockOnResume}
          onStop={mockOnStop}
          onReset={mockOnReset}
        />
      )

      // Start button should be visible and enabled
      const startButton = screen.getByRole('button', { name: /start workout/i })
      expect(startButton).toBeInTheDocument()
      expect(startButton).toBeEnabled()

      // Other buttons should not be visible or should be disabled
      expect(screen.queryByRole('button', { name: /pause/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /resume/i })).not.toBeInTheDocument()
      
      // Stop and reset might be visible but disabled
      const stopButton = screen.queryByRole('button', { name: /stop/i })
      const resetButton = screen.queryByRole('button', { name: /reset/i })
      
      if (stopButton) expect(stopButton).toBeDisabled()
      if (resetButton) expect(resetButton).toBeDisabled()
    })

    /**
     * Test button visibility in running state
     * Business Rule: In running state, pause and stop buttons should be available
     */
    test('should show pause and stop buttons in running state', () => {
      const runningState = createTimerState({ 
        status: 'running',
        timeElapsed: 30000 // 30 seconds elapsed
      })

      render(
        <TimerControls
          state={runningState}
          config={defaultConfig}
          onStart={mockOnStart}
          onPause={mockOnPause}
          onResume={mockOnResume}
          onStop={mockOnStop}
          onReset={mockOnReset}
        />
      )

      // Pause button should be visible and enabled
      const pauseButton = screen.getByRole('button', { name: /pause/i })
      expect(pauseButton).toBeInTheDocument()
      expect(pauseButton).toBeEnabled()

      // Stop button should be visible and enabled
      const stopButton = screen.getByRole('button', { name: /stop/i })
      expect(stopButton).toBeInTheDocument()
      expect(stopButton).toBeEnabled()

      // Start and resume buttons should not be visible
      expect(screen.queryByRole('button', { name: /start workout/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /resume/i })).not.toBeInTheDocument()
    })

    /**
     * Test button visibility in paused state
     * Business Rule: In paused state, resume, stop, and reset buttons should be available
     */
    test('should show resume, stop, and reset buttons in paused state', () => {
      const pausedState = createTimerState({ 
        status: 'paused',
        timeElapsed: 45000 // 45 seconds elapsed
      })

      render(
        <TimerControls
          state={pausedState}
          config={defaultConfig}
          onStart={mockOnStart}
          onPause={mockOnPause}
          onResume={mockOnResume}
          onStop={mockOnStop}
          onReset={mockOnReset}
        />
      )

      // Resume button should be visible and enabled
      const resumeButton = screen.getByRole('button', { name: /resume/i })
      expect(resumeButton).toBeInTheDocument()
      expect(resumeButton).toBeEnabled()

      // Stop button should be visible and enabled
      const stopButton = screen.getByRole('button', { name: /stop/i })
      expect(stopButton).toBeInTheDocument()
      expect(stopButton).toBeEnabled()

      // Reset button should be visible and enabled
      const resetButton = screen.getByRole('button', { name: /reset/i })
      expect(resetButton).toBeInTheDocument()
      expect(resetButton).toBeEnabled()

      // Start and pause buttons should not be visible
      expect(screen.queryByRole('button', { name: /start workout/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /pause/i })).not.toBeInTheDocument()
    })

    /**
     * Test button visibility in completed state
     * Business Rule: In completed state, only reset/new workout button should be available
     */
    test('should show reset button in completed state', () => {
      const completedState = createTimerState({ 
        status: 'completed',
        workoutProgress: 1
      })

      render(
        <TimerControls
          state={completedState}
          config={defaultConfig}
          onStart={mockOnStart}
          onPause={mockOnPause}
          onResume={mockOnResume}
          onStop={mockOnStop}
          onReset={mockOnReset}
        />
      )

      // Reset/New Workout button should be visible and enabled
      const resetButton = screen.getByRole('button', { name: /new workout|reset/i })
      expect(resetButton).toBeInTheDocument()
      expect(resetButton).toBeEnabled()

      // Other control buttons should not be visible
      expect(screen.queryByRole('button', { name: /start workout/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /pause/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /resume/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /stop/i })).not.toBeInTheDocument()
    })
  })

  describe('Button Click Handlers', () => {
    const user = userEvent.setup()

    /**
     * Test start button functionality
     * Business Rule: Start button should trigger workout start
     */
    test('should call onStart when start button is clicked', async () => {
      const idleState = createTimerState({ status: 'idle' })

      render(
        <TimerControls
          state={idleState}
          config={defaultConfig}
          onStart={mockOnStart}
          onPause={mockOnPause}
          onResume={mockOnResume}
          onStop={mockOnStop}
          onReset={mockOnReset}
        />
      )

      const startButton = screen.getByRole('button', { name: /start workout/i })
      await user.click(startButton)

      expect(mockOnStart).toHaveBeenCalledTimes(1)
      expect(mockOnStart).toHaveBeenCalledWith()
    })

    /**
     * Test pause button functionality
     * Business Rule: Pause button should trigger timer pause
     */
    test('should call onPause when pause button is clicked', async () => {
      const runningState = createTimerState({ status: 'running' })

      render(
        <TimerControls
          state={runningState}
          config={defaultConfig}
          onStart={mockOnStart}
          onPause={mockOnPause}
          onResume={mockOnResume}
          onStop={mockOnStop}
          onReset={mockOnReset}
        />
      )

      const pauseButton = screen.getByRole('button', { name: /pause/i })
      await user.click(pauseButton)

      expect(mockOnPause).toHaveBeenCalledTimes(1)
      expect(mockOnPause).toHaveBeenCalledWith()
    })

    /**
     * Test resume button functionality
     * Business Rule: Resume button should trigger timer resume
     */
    test('should call onResume when resume button is clicked', async () => {
      const pausedState = createTimerState({ status: 'paused' })

      render(
        <TimerControls
          state={pausedState}
          config={defaultConfig}
          onStart={mockOnStart}
          onPause={mockOnPause}
          onResume={mockOnResume}
          onStop={mockOnStop}
          onReset={mockOnReset}
        />
      )

      const resumeButton = screen.getByRole('button', { name: /resume/i })
      await user.click(resumeButton)

      expect(mockOnResume).toHaveBeenCalledTimes(1)
      expect(mockOnResume).toHaveBeenCalledWith()
    })

    /**
     * Test stop button functionality
     * Business Rule: Stop button should trigger timer stop
     */
    test('should call onStop when stop button is clicked', async () => {
      const runningState = createTimerState({ status: 'running' })

      render(
        <TimerControls
          state={runningState}
          config={defaultConfig}
          onStart={mockOnStart}
          onPause={mockOnPause}
          onResume={mockOnResume}
          onStop={mockOnStop}
          onReset={mockOnReset}
        />
      )

      const stopButton = screen.getByRole('button', { name: /stop/i })
      await user.click(stopButton)

      expect(mockOnStop).toHaveBeenCalledTimes(1)
      expect(mockOnStop).toHaveBeenCalledWith()
    })

    /**
     * Test reset button functionality
     * Business Rule: Reset button should trigger timer reset
     */
    test('should call onReset when reset button is clicked', async () => {
      const pausedState = createTimerState({ status: 'paused' })

      render(
        <TimerControls
          state={pausedState}
          config={defaultConfig}
          onStart={mockOnStart}
          onPause={mockOnPause}
          onResume={mockOnResume}
          onStop={mockOnStop}
          onReset={mockOnReset}
        />
      )

      const resetButton = screen.getByRole('button', { name: /reset/i })
      await user.click(resetButton)

      expect(mockOnReset).toHaveBeenCalledTimes(1)
      expect(mockOnReset).toHaveBeenCalledWith()
    })
  })

  describe('Keyboard Shortcuts', () => {
    /**
     * Test spacebar for play/pause functionality
     * Business Rule: Spacebar should toggle play/pause state
     */
    test('should handle spacebar for play/pause', async () => {
      const user = userEvent.setup()

      // Test spacebar in idle state (should start)
      const idleState = createTimerState({ status: 'idle' })
      const { rerender } = render(
        <TimerControls
          state={idleState}
          config={defaultConfig}
          onStart={mockOnStart}
          onPause={mockOnPause}
          onResume={mockOnResume}
          onStop={mockOnStop}
          onReset={mockOnReset}
        />
      )

      await user.keyboard(' ')
      expect(mockOnStart).toHaveBeenCalledTimes(1)

      // Test spacebar in running state (should pause)
      const runningState = createTimerState({ status: 'running' })
      rerender(
        <TimerControls
          state={runningState}
          config={defaultConfig}
          onStart={mockOnStart}
          onPause={mockOnPause}
          onResume={mockOnResume}
          onStop={mockOnStop}
          onReset={mockOnReset}
        />
      )

      await user.keyboard(' ')
      expect(mockOnPause).toHaveBeenCalledTimes(1)

      // Test spacebar in paused state (should resume)
      const pausedState = createTimerState({ status: 'paused' })
      rerender(
        <TimerControls
          state={pausedState}
          config={defaultConfig}
          onStart={mockOnStart}
          onPause={mockOnPause}
          onResume={mockOnResume}
          onStop={mockOnStop}
          onReset={mockOnReset}
        />
      )

      await user.keyboard(' ')
      expect(mockOnResume).toHaveBeenCalledTimes(1)
    })

    /**
     * Test Escape key for stop functionality
     * Business Rule: Escape key should stop the timer
     */
    test('should handle escape key for stop', async () => {
      const user = userEvent.setup()
      const runningState = createTimerState({ status: 'running' })

      render(
        <TimerControls
          state={runningState}
          config={defaultConfig}
          onStart={mockOnStart}
          onPause={mockOnPause}
          onResume={mockOnResume}
          onStop={mockOnStop}
          onReset={mockOnReset}
        />
      )

      await user.keyboard('{Escape}')
      expect(mockOnStop).toHaveBeenCalledTimes(1)
    })

    /**
     * Test R key for reset functionality
     * Business Rule: R key should reset the timer when not running
     */
    test('should handle R key for reset', async () => {
      const user = userEvent.setup()
      const pausedState = createTimerState({ status: 'paused' })

      render(
        <TimerControls
          state={pausedState}
          config={defaultConfig}
          onStart={mockOnStart}
          onPause={mockOnPause}
          onResume={mockOnResume}
          onStop={mockOnStop}
          onReset={mockOnReset}
        />
      )

      await user.keyboard('r')
      expect(mockOnReset).toHaveBeenCalledTimes(1)
    })

    /**
     * Test keyboard shortcuts don't interfere with input fields
     * Business Rule: Keyboard shortcuts should be disabled when input fields are focused
     */
    test('should not trigger shortcuts when input is focused', async () => {
      const user = userEvent.setup()
      const runningState = createTimerState({ status: 'running' })

      render(
        <div>
          <input data-testid="test-input" />
          <TimerControls
            state={runningState}
            config={defaultConfig}
            onStart={mockOnStart}
            onPause={mockOnPause}
            onResume={mockOnResume}
            onStop={mockOnStop}
            onReset={mockOnReset}
          />
        </div>
      )

      // Focus input field
      const input = screen.getByTestId('test-input')
      await user.click(input)

      // Press spacebar - should not trigger pause
      await user.keyboard(' ')
      expect(mockOnPause).not.toHaveBeenCalled()
    })
  })

  describe('Touch and Mobile Interactions', () => {
    /**
     * Test touch-friendly button sizing
     * Business Rule: Buttons should be large enough for touch interaction (44px minimum)
     */
    test('should have touch-friendly button sizes', () => {
      const runningState = createTimerState({ status: 'running' })

      render(
        <TimerControls
          state={runningState}
          config={defaultConfig}
          onStart={mockOnStart}
          onPause={mockOnPause}
          onResume={mockOnResume}
          onStop={mockOnStop}
          onReset={mockOnReset}
          touchOptimized={true}
        />
      )

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveClass('touch-optimized')
      })
    })

    /**
     * Test haptic feedback support
     * Business Rule: Touch interactions should provide haptic feedback on supported devices
     */
    test('should trigger haptic feedback on touch devices', async () => {
      const mockVibrate = jest.fn()
      Object.defineProperty(navigator, 'vibrate', {
        value: mockVibrate,
        writable: true
      })

      const user = userEvent.setup()
      const idleState = createTimerState({ status: 'idle' })

      render(
        <TimerControls
          state={idleState}
          config={defaultConfig}
          onStart={mockOnStart}
          onPause={mockOnPause}
          onResume={mockOnResume}
          onStop={mockOnStop}
          onReset={mockOnReset}
          enableHaptics={true}
        />
      )

      const startButton = screen.getByRole('button', { name: /start workout/i })
      await user.click(startButton)

      expect(mockVibrate).toHaveBeenCalledWith([10]) // Short vibration
    })

    /**
     * Test double-tap prevention
     * Business Rule: Buttons should prevent accidental double-taps
     */
    test('should prevent double-tap activation', async () => {
      const user = userEvent.setup()
      const idleState = createTimerState({ status: 'idle' })

      render(
        <TimerControls
          state={idleState}
          config={defaultConfig}
          onStart={mockOnStart}
          onPause={mockOnPause}
          onResume={mockOnResume}
          onStop={mockOnStop}
          onReset={mockOnReset}
        />
      )

      const startButton = screen.getByRole('button', { name: /start workout/i })
      
      // Rapid double-click
      await user.click(startButton)
      await user.click(startButton)

      // Should only be called once due to debouncing
      expect(mockOnStart).toHaveBeenCalledTimes(1)
    })
  })

  describe('Visual Feedback and Loading States', () => {
    /**
     * Test button loading states
     * Business Rule: Buttons should show loading state during async operations
     */
    test('should show loading state during operations', async () => {
      const user = userEvent.setup()
      const idleState = createTimerState({ status: 'idle' })

      // Mock async start function
      const asyncOnStart = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)))

      render(
        <TimerControls
          state={idleState}
          config={defaultConfig}
          onStart={asyncOnStart}
          onPause={mockOnPause}
          onResume={mockOnResume}
          onStop={mockOnStop}
          onReset={mockOnReset}
        />
      )

      const startButton = screen.getByRole('button', { name: /start workout/i })
      await user.click(startButton)

      // Button should show loading state
      expect(startButton).toHaveAttribute('aria-busy', 'true')
      expect(screen.getByRole('status')).toBeInTheDocument() // Loading indicator

      // Wait for async operation to complete
      await waitFor(() => {
        expect(startButton).not.toHaveAttribute('aria-busy')
      })
    })

    /**
     * Test visual state transitions
     * Business Rule: Button appearance should reflect current timer state
     */
    test('should update button appearance based on timer state', () => {
      const states = [
        { state: createTimerState({ status: 'idle' }), expectedClass: 'controls--idle' },
        { state: createTimerState({ status: 'running' }), expectedClass: 'controls--running' },
        { state: createTimerState({ status: 'paused' }), expectedClass: 'controls--paused' },
        { state: createTimerState({ status: 'completed' }), expectedClass: 'controls--completed' }
      ]

      states.forEach(({ state, expectedClass }) => {
        const { container } = render(
          <TimerControls
            state={state}
            config={defaultConfig}
            onStart={mockOnStart}
            onPause={mockOnPause}
            onResume={mockOnResume}
            onStop={mockOnStop}
            onReset={mockOnReset}
          />
        )

        expect(container.firstChild).toHaveClass(expectedClass)
      })
    })
  })

  describe('Accessibility Features', () => {
    /**
     * Test ARIA labels and roles
     * Business Rule: Controls must be accessible to screen readers
     */
    test('should have proper ARIA labels and roles', () => {
      const runningState = createTimerState({ status: 'running' })

      render(
        <TimerControls
          state={runningState}
          config={defaultConfig}
          onStart={mockOnStart}
          onPause={mockOnPause}
          onResume={mockOnResume}
          onStop={mockOnStop}
          onReset={mockOnReset}
        />
      )

      // Controls container should have proper role
      const controls = screen.getByRole('group', { name: /timer controls/i })
      expect(controls).toBeInTheDocument()

      // Individual buttons should have descriptive labels
      const pauseButton = screen.getByRole('button', { name: /pause workout/i })
      expect(pauseButton).toHaveAttribute('aria-describedby')

      const stopButton = screen.getByRole('button', { name: /stop workout/i })
      expect(stopButton).toHaveAttribute('aria-describedby')
    })

    /**
     * Test keyboard navigation
     * Business Rule: Controls should be navigable via keyboard
     */
    test('should support keyboard navigation', () => {
      const pausedState = createTimerState({ status: 'paused' })

      render(
        <TimerControls
          state={pausedState}
          config={defaultConfig}
          onStart={mockOnStart}
          onPause={mockOnPause}
          onResume={mockOnResume}
          onStop={mockOnStop}
          onReset={mockOnReset}
        />
      )

      const buttons = screen.getAllByRole('button')
      
      // All buttons should be focusable
      buttons.forEach(button => {
        expect(button).toHaveAttribute('tabIndex', '0')
      })

      // Focus should be visible
      buttons.forEach(button => {
        fireEvent.focus(button)
        expect(button).toHaveClass('focus-visible')
      })
    })

    /**
     * Test screen reader announcements
     * Business Rule: Important actions should be announced to screen readers
     */
    test('should announce actions to screen readers', async () => {
      const user = userEvent.setup()
      const idleState = createTimerState({ status: 'idle' })

      render(
        <TimerControls
          state={idleState}
          config={defaultConfig}
          onStart={mockOnStart}
          onPause={mockOnPause}
          onResume={mockOnResume}
          onStop={mockOnStop}
          onReset={mockOnReset}
        />
      )

      const startButton = screen.getByRole('button', { name: /start workout/i })
      await user.click(startButton)

      // Should announce action
      const announcement = screen.getByRole('status')
      expect(announcement).toHaveTextContent(/workout started/i)
    })
  })

  describe('Error Handling', () => {
    /**
     * Test handling of missing callback functions
     * Business Rule: Component should handle missing props gracefully
     */
    test('should handle missing callback functions gracefully', async () => {
      const user = userEvent.setup()
      const idleState = createTimerState({ status: 'idle' })

      // Render without some callbacks
      render(
        <TimerControls
          state={idleState}
          config={defaultConfig}
          onStart={undefined as any}
          onPause={mockOnPause}
          onResume={mockOnResume}
          onStop={mockOnStop}
          onReset={mockOnReset}
        />
      )

      // Start button should be disabled when callback is missing
      const startButton = screen.getByRole('button', { name: /start workout/i })
      expect(startButton).toBeDisabled()
    })

    /**
     * Test handling of callback errors
     * Business Rule: Callback errors should not crash the component
     */
    test('should handle callback errors gracefully', async () => {
      const user = userEvent.setup()
      const errorOnStart = jest.fn(() => {
        throw new Error('Start failed')
      })

      const idleState = createTimerState({ status: 'idle' })

      render(
        <TimerControls
          state={idleState}
          config={defaultConfig}
          onStart={errorOnStart}
          onPause={mockOnPause}
          onResume={mockOnResume}
          onStop={mockOnStop}
          onReset={mockOnReset}
        />
      )

      const startButton = screen.getByRole('button', { name: /start workout/i })

      // Should not throw when callback errors
      await expect(user.click(startButton)).resolves.toBeUndefined()

      // Error should be handled and possibly displayed
      const errorMessage = screen.queryByRole('alert')
      if (errorMessage) {
        expect(errorMessage).toHaveTextContent(/error/i)
      }
    })
  })

  describe('Performance Optimizations', () => {
    /**
     * Test memo optimization
     * Business Rule: Component should not re-render unnecessarily
     */
    test('should not re-render when props have not changed', () => {
      const renderSpy = jest.fn()
      const state = createTimerState({ status: 'running' })

      const TestWrapper = ({ testState }: { testState: TimerState }) => {
        renderSpy()
        return (
          <TimerControls
            state={testState}
            config={defaultConfig}
            onStart={mockOnStart}
            onPause={mockOnPause}
            onResume={mockOnResume}
            onStop={mockOnStop}
            onReset={mockOnReset}
          />
        )
      }

      const { rerender } = render(<TestWrapper testState={state} />)
      expect(renderSpy).toHaveBeenCalledTimes(1)

      // Re-render with same props
      rerender(<TestWrapper testState={state} />)
      expect(renderSpy).toHaveBeenCalledTimes(1) // No additional render

      // Re-render with different props
      const newState = createTimerState({ status: 'paused' })
      rerender(<TestWrapper testState={newState} />)
      expect(renderSpy).toHaveBeenCalledTimes(2)
    })

    /**
     * Test event handler optimization
     * Business Rule: Event handlers should be stable references
     */
    test('should maintain stable event handler references', () => {
      const state = createTimerState({ status: 'running' })

      const { rerender } = render(
        <TimerControls
          state={state}
          config={defaultConfig}
          onStart={mockOnStart}
          onPause={mockOnPause}
          onResume={mockOnResume}
          onStop={mockOnStop}
          onReset={mockOnReset}
        />
      )

      const initialPauseButton = screen.getByRole('button', { name: /pause/i })
      const initialHandler = initialPauseButton.onclick

      // Re-render with same callbacks
      rerender(
        <TimerControls
          state={state}
          config={defaultConfig}
          onStart={mockOnStart}
          onPause={mockOnPause}
          onResume={mockOnResume}
          onStop={mockOnStop}
          onReset={mockOnReset}
        />
      )

      const updatedPauseButton = screen.getByRole('button', { name: /pause/i })
      const updatedHandler = updatedPauseButton.onclick

      // Handler references should be stable
      expect(updatedHandler).toBe(initialHandler)
    })
  })
})