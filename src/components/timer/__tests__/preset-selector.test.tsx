/**
 * Preset Selector Component Unit Tests
 * 
 * Comprehensive test suite for the PresetSelector component focusing on:
 * - Boxing workout preset options (beginner, intermediate, advanced)
 * - Custom configuration creation and validation
 * - Preset selection and configuration updates
 * - Visual preview of preset specifications
 * - Accessibility and keyboard navigation
 * - Mobile-responsive preset interface
 * - Error handling and validation feedback
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PresetSelector } from '../preset-selector'
import { TimerConfig } from '../../../lib/timer-engine'

describe('PresetSelector Component', () => {
  const mockOnPresetSelect = jest.fn()
  const mockOnCustomConfig = jest.fn()

  const defaultProps = {
    currentPreset: 'beginner' as const,
    customConfig: null,
    onPresetSelect: mockOnPresetSelect,
    onCustomConfig: mockOnCustomConfig,
    disabled: false
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Preset Display and Selection', () => {
    /**
     * Test preset option display
     * Business Rule: All boxing presets should be clearly displayed with specifications
     */
    test('should display all preset options', () => {
      render(<PresetSelector {...defaultProps} />)

      // Check that all preset options are displayed
      expect(screen.getByRole('button', { name: /beginner/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /intermediate/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /advanced/i })).toBeInTheDocument()

      // Check for custom option
      expect(screen.getByRole('button', { name: /custom/i })).toBeInTheDocument()
    })

    /**
     * Test preset specification display
     * Business Rule: Each preset should show work duration, rest duration, and rounds
     */
    test('should display preset specifications correctly', () => {
      render(<PresetSelector {...defaultProps} />)

      // Beginner preset specifications
      const beginnerPreset = screen.getByTestId('preset-beginner')
      expect(beginnerPreset).toHaveTextContent('2 min work')
      expect(beginnerPreset).toHaveTextContent('1 min rest')
      expect(beginnerPreset).toHaveTextContent('3 rounds')

      // Intermediate preset specifications
      const intermediatePreset = screen.getByTestId('preset-intermediate')
      expect(intermediatePreset).toHaveTextContent('3 min work')
      expect(intermediatePreset).toHaveTextContent('1 min rest')
      expect(intermediatePreset).toHaveTextContent('5 rounds')

      // Advanced preset specifications
      const advancedPreset = screen.getByTestId('preset-advanced')
      expect(advancedPreset).toHaveTextContent('3 min work')
      expect(advancedPreset).toHaveTextContent('1 min rest')
      expect(advancedPreset).toHaveTextContent('12 rounds')
    })

    /**
     * Test total workout duration display
     * Business Rule: Each preset should show estimated total workout time
     */
    test('should display total workout duration for each preset', () => {
      render(<PresetSelector {...defaultProps} />)

      // Beginner: (2 + 1) * 3 - 1 = 8 minutes
      const beginnerPreset = screen.getByTestId('preset-beginner')
      expect(beginnerPreset).toHaveTextContent('~8 min total')

      // Intermediate: (3 + 1) * 5 - 1 = 19 minutes
      const intermediatePreset = screen.getByTestId('preset-intermediate')
      expect(intermediatePreset).toHaveTextContent('~19 min total')

      // Advanced: (3 + 1) * 12 - 1 = 47 minutes
      const advancedPreset = screen.getByTestId('preset-advanced')
      expect(advancedPreset).toHaveTextContent('~47 min total')
    })

    /**
     * Test active preset highlighting
     * Business Rule: Currently selected preset should be visually highlighted
     */
    test('should highlight the currently selected preset', () => {
      render(<PresetSelector {...defaultProps} currentPreset="intermediate" />)

      const beginnerPreset = screen.getByTestId('preset-beginner')
      const intermediatePreset = screen.getByTestId('preset-intermediate')
      const advancedPreset = screen.getByTestId('preset-advanced')

      expect(beginnerPreset).not.toHaveClass('preset--selected')
      expect(intermediatePreset).toHaveClass('preset--selected')
      expect(advancedPreset).not.toHaveClass('preset--selected')
    })
  })

  describe('Preset Selection Functionality', () => {
    const user = userEvent.setup()

    /**
     * Test preset selection callback
     * Business Rule: Selecting a preset should trigger callback with preset name
     */
    test('should call onPresetSelect when preset is clicked', async () => {
      render(<PresetSelector {...defaultProps} />)

      const intermediatePreset = screen.getByRole('button', { name: /intermediate/i })
      await user.click(intermediatePreset)

      expect(mockOnPresetSelect).toHaveBeenCalledWith('intermediate')
      expect(mockOnPresetSelect).toHaveBeenCalledTimes(1)
    })

    /**
     * Test multiple preset selections
     * Business Rule: Each preset selection should trigger appropriate callback
     */
    test('should handle multiple preset selections', async () => {
      render(<PresetSelector {...defaultProps} />)

      // Select advanced preset
      await user.click(screen.getByRole('button', { name: /advanced/i }))
      expect(mockOnPresetSelect).toHaveBeenCalledWith('advanced')

      // Select beginner preset
      await user.click(screen.getByRole('button', { name: /beginner/i }))
      expect(mockOnPresetSelect).toHaveBeenCalledWith('beginner')

      expect(mockOnPresetSelect).toHaveBeenCalledTimes(2)
    })

    /**
     * Test disabled state
     * Business Rule: Disabled selector should not respond to clicks
     */
    test('should not respond to clicks when disabled', async () => {
      render(<PresetSelector {...defaultProps} disabled={true} />)

      const intermediatePreset = screen.getByRole('button', { name: /intermediate/i })
      expect(intermediatePreset).toBeDisabled()

      await user.click(intermediatePreset)
      expect(mockOnPresetSelect).not.toHaveBeenCalled()
    })
  })

  describe('Custom Configuration', () => {
    /**
     * Test custom configuration toggle
     * Business Rule: Custom option should open configuration form
     */
    test('should show custom configuration form when custom is selected', async () => {
      render(<PresetSelector {...defaultProps} />)

      const customButton = screen.getByRole('button', { name: /custom/i })
      await user.click(customButton)

      // Custom configuration form should appear
      expect(screen.getByRole('dialog', { name: /custom timer settings/i })).toBeInTheDocument()
      expect(screen.getByLabelText(/work duration/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/rest duration/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/total rounds/i)).toBeInTheDocument()
    })

    /**
     * Test custom configuration input handling
     * Business Rule: Custom form should validate and update configuration
     */
    test('should handle custom configuration input', async () => {
      render(<PresetSelector {...defaultProps} />)

      // Open custom configuration
      await user.click(screen.getByRole('button', { name: /custom/i }))

      // Fill in custom values
      const workDurationInput = screen.getByLabelText(/work duration/i)
      const restDurationInput = screen.getByLabelText(/rest duration/i)
      const totalRoundsInput = screen.getByLabelText(/total rounds/i)

      await user.clear(workDurationInput)
      await user.type(workDurationInput, '240') // 4 minutes

      await user.clear(restDurationInput)
      await user.type(restDurationInput, '90') // 1.5 minutes

      await user.clear(totalRoundsInput)
      await user.type(totalRoundsInput, '8') // 8 rounds

      // Save configuration
      const saveButton = screen.getByRole('button', { name: /save/i })
      await user.click(saveButton)

      expect(mockOnCustomConfig).toHaveBeenCalledWith({
        workDuration: 240,
        restDuration: 90,
        totalRounds: 8,
        enableWarning: true
      })
    })

    /**
     * Test custom configuration validation
     * Business Rule: Invalid configurations should show validation errors
     */
    test('should validate custom configuration inputs', async () => {
      render(<PresetSelector {...defaultProps} />)

      // Open custom configuration
      await user.click(screen.getByRole('button', { name: /custom/i }))

      // Enter invalid values
      const workDurationInput = screen.getByLabelText(/work duration/i)
      const totalRoundsInput = screen.getByLabelText(/total rounds/i)

      await user.clear(workDurationInput)
      await user.type(workDurationInput, '0') // Invalid: zero duration

      await user.clear(totalRoundsInput)
      await user.type(totalRoundsInput, '-1') // Invalid: negative rounds

      // Try to save
      const saveButton = screen.getByRole('button', { name: /save/i })
      await user.click(saveButton)

      // Should show validation errors
      expect(screen.getByText(/work duration must be greater than 0/i)).toBeInTheDocument()
      expect(screen.getByText(/rounds must be at least 1/i)).toBeInTheDocument()

      // Should not call callback with invalid data
      expect(mockOnCustomConfig).not.toHaveBeenCalled()
    })

    /**
     * Test custom configuration preview
     * Business Rule: Custom form should show workout duration preview
     */
    test('should show workout duration preview in custom form', async () => {
      render(<PresetSelector {...defaultProps} />)

      // Open custom configuration
      await user.click(screen.getByRole('button', { name: /custom/i }))

      // Enter valid values
      const workDurationInput = screen.getByLabelText(/work duration/i)
      const restDurationInput = screen.getByLabelText(/rest duration/i)
      const totalRoundsInput = screen.getByLabelName(/total rounds/i)

      await user.clear(workDurationInput)
      await user.type(workDurationInput, '300') // 5 minutes

      await user.clear(restDurationInput)
      await user.type(restDurationInput, '120') // 2 minutes

      await user.clear(totalRoundsInput)
      await user.type(totalRoundsInput, '4') // 4 rounds

      // Should show calculated total: (5 + 2) * 4 - 2 = 26 minutes
      expect(screen.getByText(/total workout: ~26 minutes/i)).toBeInTheDocument()
    })
  })

  describe('Keyboard Navigation and Accessibility', () => {
    /**
     * Test keyboard navigation between presets
     * Business Rule: User should be able to navigate presets with keyboard
     */
    test('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<PresetSelector {...defaultProps} />)

      const presetGroup = screen.getByRole('radiogroup', { name: /workout presets/i })
      expect(presetGroup).toBeInTheDocument()

      // Focus first preset
      await user.tab()
      expect(screen.getByRole('radio', { name: /beginner/i })).toHaveFocus()

      // Navigate with arrow keys
      await user.keyboard('{ArrowRight}')
      expect(screen.getByRole('radio', { name: /intermediate/i })).toHaveFocus()

      await user.keyboard('{ArrowRight}')
      expect(screen.getByRole('radio', { name: /advanced/i })).toHaveFocus()

      await user.keyboard('{ArrowRight}')
      expect(screen.getByRole('radio', { name: /custom/i })).toHaveFocus()

      // Wrap around
      await user.keyboard('{ArrowRight}')
      expect(screen.getByRole('radio', { name: /beginner/i })).toHaveFocus()
    })

    /**
     * Test preset selection with keyboard
     * Business Rule: Space/Enter should select focused preset
     */
    test('should select preset with keyboard', async () => {
      const user = userEvent.setup()
      render(<PresetSelector {...defaultProps} />)

      // Navigate to intermediate preset
      await user.tab()
      await user.keyboard('{ArrowRight}')

      // Select with Space
      await user.keyboard(' ')
      expect(mockOnPresetSelect).toHaveBeenCalledWith('intermediate')

      // Navigate to advanced preset
      await user.keyboard('{ArrowRight}')

      // Select with Enter
      await user.keyboard('{Enter}')
      expect(mockOnPresetSelect).toHaveBeenCalledWith('advanced')
    })

    /**
     * Test ARIA labels and descriptions
     * Business Rule: Presets should have descriptive ARIA labels
     */
    test('should have proper ARIA labels and descriptions', () => {
      render(<PresetSelector {...defaultProps} />)

      // Check radiogroup label
      const presetGroup = screen.getByRole('radiogroup')
      expect(presetGroup).toHaveAccessibleName(/workout presets/i)

      // Check individual preset labels
      const beginnerRadio = screen.getByRole('radio', { name: /beginner/i })
      expect(beginnerRadio).toHaveAccessibleName(/beginner.*2 min work.*1 min rest.*3 rounds/i)

      const intermediateRadio = screen.getByRole('radio', { name: /intermediate/i })
      expect(intermediateRadio).toHaveAccessibleName(/intermediate.*3 min work.*1 min rest.*5 rounds/i)

      const advancedRadio = screen.getByRole('radio', { name: /advanced/i })
      expect(advancedRadio).toHaveAccessibleName(/advanced.*3 min work.*1 min rest.*12 rounds/i)
    })

    /**
     * Test screen reader announcements
     * Business Rule: Preset changes should be announced to screen readers
     */
    test('should announce preset changes to screen readers', async () => {
      const user = userEvent.setup()
      render(<PresetSelector {...defaultProps} />)

      const intermediateRadio = screen.getByRole('radio', { name: /intermediate/i })
      await user.click(intermediateRadio)

      // Should announce the selection
      const liveRegion = screen.getByRole('status')
      expect(liveRegion).toHaveTextContent(/intermediate preset selected/i)
    })
  })

  describe('Mobile and Touch Interface', () => {
    /**
     * Test mobile-optimized layout
     * Business Rule: Mobile layout should stack presets vertically
     */
    test('should use mobile layout on small screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375 // iPhone width
      })

      render(<PresetSelector {...defaultProps} isMobile={true} />)

      const container = screen.getByTestId('preset-selector')
      expect(container).toHaveClass('preset-selector--mobile')

      // Presets should be stacked vertically
      const presetButtons = screen.getAllByRole('radio')
      presetButtons.forEach(button => {
        expect(button).toHaveClass('preset--mobile')
      })
    })

    /**
     * Test touch-friendly sizing
     * Business Rule: Touch targets should be at least 44px
     */
    test('should have touch-friendly preset buttons', () => {
      render(<PresetSelector {...defaultProps} touchOptimized={true} />)

      const presetButtons = screen.getAllByRole('radio')
      presetButtons.forEach(button => {
        expect(button).toHaveClass('preset--touch')
        
        // Check computed styles for minimum touch target size
        const styles = window.getComputedStyle(button)
        expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(44)
      })
    })

    /**
     * Test swipe gestures for preset navigation
     * Business Rule: Mobile users should be able to swipe between presets
     */
    test('should support swipe gestures on mobile', async () => {
      render(<PresetSelector {...defaultProps} enableSwipeNavigation={true} />)

      const container = screen.getByTestId('preset-selector')

      // Simulate swipe left (next preset)
      fireEvent.touchStart(container, {
        touches: [{ clientX: 100, clientY: 100 }]
      })
      fireEvent.touchMove(container, {
        touches: [{ clientX: 50, clientY: 100 }]
      })
      fireEvent.touchEnd(container)

      // Should select next preset
      await waitFor(() => {
        expect(mockOnPresetSelect).toHaveBeenCalledWith('intermediate')
      })
    })
  })

  describe('Visual States and Feedback', () => {
    /**
     * Test hover states
     * Business Rule: Preset buttons should provide visual feedback on hover
     */
    test('should show hover states for preset buttons', async () => {
      const user = userEvent.setup()
      render(<PresetSelector {...defaultProps} />)

      const intermediateButton = screen.getByRole('radio', { name: /intermediate/i })
      
      await user.hover(intermediateButton)
      expect(intermediateButton).toHaveClass('preset--hover')

      await user.unhover(intermediateButton)
      expect(intermediateButton).not.toHaveClass('preset--hover')
    })

    /**
     * Test focus states
     * Business Rule: Focused presets should have visible focus indicators
     */
    test('should show focus states for keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<PresetSelector {...defaultProps} />)

      await user.tab()
      const focusedButton = screen.getByRole('radio', { name: /beginner/i })
      expect(focusedButton).toHaveClass('preset--focused')
    })

    /**
     * Test loading state during preset application
     * Business Rule: UI should show loading feedback when applying presets
     */
    test('should show loading state when applying preset', async () => {
      const user = userEvent.setup()
      
      // Mock async preset selection
      const asyncOnPresetSelect = jest.fn(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      )

      render(
        <PresetSelector 
          {...defaultProps}
          onPresetSelect={asyncOnPresetSelect}
        />
      )

      const intermediateButton = screen.getByRole('radio', { name: /intermediate/i })
      await user.click(intermediateButton)

      // Should show loading state
      expect(intermediateButton).toHaveAttribute('aria-busy', 'true')
      expect(screen.getByRole('status')).toHaveTextContent(/applying preset/i)

      // Wait for completion
      await waitFor(() => {
        expect(intermediateButton).not.toHaveAttribute('aria-busy')
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    /**
     * Test handling of invalid current preset
     * Business Rule: Invalid preset should fall back to default
     */
    test('should handle invalid current preset gracefully', () => {
      render(
        <PresetSelector 
          {...defaultProps}
          currentPreset={'invalid' as 'beginner'}
        />
      )

      // Should fall back to beginner preset
      const beginnerButton = screen.getByRole('radio', { name: /beginner/i })
      expect(beginnerButton).toBeChecked()
    })

    /**
     * Test handling of custom config with invalid values
     * Business Rule: Invalid custom config should show validation errors
     */
    test('should handle invalid custom configuration', () => {
      const invalidCustomConfig: TimerConfig = {
        workDuration: -120, // Invalid negative
        restDuration: 0,    // Invalid zero
        totalRounds: 0,     // Invalid zero
        enableWarning: true
      }

      render(
        <PresetSelector 
          {...defaultProps}
          customConfig={invalidCustomConfig}
        />
      )

      // Custom preset should show validation warnings
      const customButton = screen.getByRole('radio', { name: /custom/i })
      expect(customButton).toHaveAttribute('aria-describedby')
      
      const description = screen.getByText(/invalid configuration/i)
      expect(description).toBeInTheDocument()
    })

    /**
     * Test error recovery from failed preset application
     * Business Rule: Failed preset changes should revert to previous state
     */
    test('should handle preset application errors', async () => {
      const user = userEvent.setup()
      
      const errorOnPresetSelect = jest.fn(() => 
        Promise.reject(new Error('Failed to apply preset'))
      )

      render(
        <PresetSelector 
          {...defaultProps}
          onPresetSelect={errorOnPresetSelect}
        />
      )

      const intermediateButton = screen.getByRole('radio', { name: /intermediate/i })
      await user.click(intermediateButton)

      // Should show error message
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/failed to apply preset/i)
      })

      // Should revert to previous selection
      const beginnerButton = screen.getByRole('radio', { name: /beginner/i })
      expect(beginnerButton).toBeChecked()
    })
  })

  describe('Performance and Optimization', () => {
    /**
     * Test memo optimization
     * Business Rule: Component should not re-render unnecessarily
     */
    test('should not re-render when props have not changed', () => {
      const renderSpy = jest.fn()
      
      const TestWrapper = ({ currentPreset }: { currentPreset: string }) => {
        renderSpy()
        return (
          <PresetSelector 
            {...defaultProps}
            currentPreset={currentPreset}
          />
        )
      }

      const { rerender } = render(<TestWrapper currentPreset="beginner" />)
      expect(renderSpy).toHaveBeenCalledTimes(1)

      // Re-render with same props
      rerender(<TestWrapper currentPreset="beginner" />)
      expect(renderSpy).toHaveBeenCalledTimes(1) // No additional render

      // Re-render with different props
      rerender(<TestWrapper currentPreset="intermediate" />)
      expect(renderSpy).toHaveBeenCalledTimes(2)
    })

    /**
     * Test efficient custom form rendering
     * Business Rule: Custom form should only render when needed
     */
    test('should only render custom form when selected', () => {
      const { rerender } = render(<PresetSelector {...defaultProps} />)

      // Custom form should not be in DOM initially
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

      // Select custom preset
      rerender(
        <PresetSelector 
          {...defaultProps}
          currentPreset="custom"
        />
      )

      // Custom form should now be in DOM
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })
})