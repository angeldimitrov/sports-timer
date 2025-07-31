/**
 * Settings Dialog Component Unit Tests
 * 
 * Comprehensive test suite for the SettingsDialog component focusing on:
 * - Audio settings (volume control, mute toggle, sound selection)
 * - Timer configuration (custom durations, warning settings)
 * - Theme and display preferences
 * - Data persistence and validation
 * - Accessibility and keyboard navigation
 * - Mobile-responsive dialog interface
 * - Error handling and form validation
 * - Integration with localStorage and app settings
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsDialog } from '../settings-dialog'
import { TimerConfig } from '../../../lib/timer-engine'

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true
})

// Mock audio manager
const mockAudioManager = {
  setVolume: jest.fn(),
  setMuted: jest.fn(),
  play: jest.fn(() => Promise.resolve()),
  getState: jest.fn(() => ({
    volume: 0.8,
    isMuted: false,
    isInitialized: true
  }))
}

jest.mock('../../../lib/audio-manager', () => ({
  getAudioManager: () => mockAudioManager
}))

describe('SettingsDialog Component', () => {
  const mockOnConfigChange = jest.fn()
  const mockOnAudioSettingsChange = jest.fn()
  const mockOnClose = jest.fn()

  const defaultConfig: TimerConfig = {
    workDuration: 180, // 3 minutes
    restDuration: 60,  // 1 minute
    totalRounds: 5,
    enableWarning: true
  }

  const defaultAudioSettings = {
    volume: 0.8,
    isMuted: false,
    bellSound: 'classic',
    beepSound: 'digital'
  }

  const defaultProps = {
    isOpen: true,
    config: defaultConfig,
    audioSettings: defaultAudioSettings,
    onConfigChange: mockOnConfigChange,
    onAudioSettingsChange: mockOnAudioSettingsChange,
    onClose: mockOnClose
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  describe('Dialog Display and Navigation', () => {
    /**
     * Test dialog opening and closing
     * Business Rule: Dialog should be properly modal and closable
     */
    test('should display dialog when open', () => {
      render(<SettingsDialog {...defaultProps} />)

      const dialog = screen.getByRole('dialog', { name: /timer settings/i })
      expect(dialog).toBeInTheDocument()
      expect(dialog).toHaveAttribute('aria-modal', 'true')
    })

    test('should not display dialog when closed', () => {
      render(<SettingsDialog {...defaultProps} isOpen={false} />)

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    /**
     * Test dialog closing methods
     * Business Rule: Dialog should close via close button, escape key, or overlay click
     */
    test('should close dialog with close button', async () => {
      const user = userEvent.setup()
      render(<SettingsDialog {...defaultProps} />)

      const closeButton = screen.getByRole('button', { name: /close/i })
      await user.click(closeButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    test('should close dialog with escape key', async () => {
      const user = userEvent.setup()
      render(<SettingsDialog {...defaultProps} />)

      await user.keyboard('{Escape}')
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    test('should close dialog when clicking overlay', async () => {
      const user = userEvent.setup()
      render(<SettingsDialog {...defaultProps} />)

      const overlay = screen.getByTestId('dialog-overlay')
      await user.click(overlay)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    /**
     * Test dialog focus management
     * Business Rule: Dialog should trap focus and restore it on close
     */
    test('should trap focus within dialog', async () => {
      const user = userEvent.setup()
      render(
        <div>
          <button>Outside Button</button>
          <SettingsDialog {...defaultProps} />
        </div>
      )

      // Focus should be trapped within dialog
      await user.tab()
      expect(document.activeElement).not.toBe(screen.getByText('Outside Button'))

      // Should cycle through dialog elements
      const dialogButtons = screen.getAllByRole('button')
      const dialogInputs = screen.getAllByRole('slider')
      const focusableElements = [...dialogInputs, ...dialogButtons]

      expect(focusableElements).toContain(document.activeElement)
    })
  })

  describe('Timer Configuration Settings', () => {
    /**
     * Test work duration configuration
     * Business Rule: Work duration should be configurable with validation
     */
    test('should handle work duration changes', async () => {
      const user = userEvent.setup()
      render(<SettingsDialog {...defaultProps} />)

      const workDurationSlider = screen.getByLabelText(/work duration/i)
      expect(workDurationSlider).toHaveValue('180') // 3 minutes

      // Change to 4 minutes (240 seconds)
      await user.clear(workDurationSlider)
      await user.type(workDurationSlider, '240')

      const saveButton = screen.getByRole('button', { name: /save settings/i })
      await user.click(saveButton)

      expect(mockOnConfigChange).toHaveBeenCalledWith({
        ...defaultConfig,
        workDuration: 240
      })
    })

    /**
     * Test rest duration configuration
     * Business Rule: Rest duration should be configurable with validation
     */
    test('should handle rest duration changes', async () => {
      const user = userEvent.setup()
      render(<SettingsDialog {...defaultProps} />)

      const restDurationSlider = screen.getByLabelText(/rest duration/i)
      expect(restDurationSlider).toHaveValue('60') // 1 minute

      // Change to 90 seconds
      await user.clear(restDurationSlider)
      await user.type(restDurationSlider, '90')

      const saveButton = screen.getByRole('button', { name: /save settings/i })
      await user.click(saveButton)

      expect(mockOnConfigChange).toHaveBeenCalledWith({
        ...defaultConfig,
        restDuration: 90
      })
    })

    /**
     * Test total rounds configuration
     * Business Rule: Total rounds should be configurable between 1-20
     */
    test('should handle total rounds changes', async () => {
      const user = userEvent.setup()
      render(<SettingsDialog {...defaultProps} />)

      const totalRoundsSlider = screen.getByLabelText(/total rounds/i)
      expect(totalRoundsSlider).toHaveValue('5')

      // Change to 8 rounds
      await user.clear(totalRoundsSlider)
      await user.type(totalRoundsSlider, '8')

      const saveButton = screen.getByRole('button', { name: /save settings/i })
      await user.click(saveButton)

      expect(mockOnConfigChange).toHaveBeenCalledWith({
        ...defaultConfig,
        totalRounds: 8
      })
    })

    /**
     * Test warning settings toggle
     * Business Rule: 10-second warning should be toggleable
     */
    test('should handle warning toggle', async () => {
      const user = userEvent.setup()
      render(<SettingsDialog {...defaultProps} />)

      const warningToggle = screen.getByRole('checkbox', { name: /10-second warning/i })
      expect(warningToggle).toBeChecked()

      await user.click(warningToggle)

      const saveButton = screen.getByRole('button', { name: /save settings/i })
      await user.click(saveButton)

      expect(mockOnConfigChange).toHaveBeenCalledWith({
        ...defaultConfig,
        enableWarning: false
      })
    })

    /**
     * Test configuration validation
     * Business Rule: Invalid configurations should show validation errors
     */
    test('should validate timer configuration inputs', async () => {
      const user = userEvent.setup()
      render(<SettingsDialog {...defaultProps} />)

      // Enter invalid work duration (too low)
      const workDurationSlider = screen.getByLabelText(/work duration/i)
      await user.clear(workDurationSlider)
      await user.type(workDurationSlider, '0')

      // Enter invalid rounds (too high)
      const totalRoundsSlider = screen.getByLabelText(/total rounds/i)
      await user.clear(totalRoundsSlider)
      await user.type(totalRoundsSlider, '25')

      const saveButton = screen.getByRole('button', { name: /save settings/i })
      await user.click(saveButton)

      // Should show validation errors
      expect(screen.getByText(/work duration must be at least 10 seconds/i)).toBeInTheDocument()
      expect(screen.getByText(/total rounds cannot exceed 20/i)).toBeInTheDocument()

      // Should not call callback with invalid data
      expect(mockOnConfigChange).not.toHaveBeenCalled()
    })

    /**
     * Test workout duration preview
     * Business Rule: Settings should show calculated total workout duration
     */
    test('should show total workout duration preview', async () => {
      const user = userEvent.setup()
      render(<SettingsDialog {...defaultProps} />)

      // Default: (3 + 1) * 5 - 1 = 19 minutes
      expect(screen.getByText(/total workout: ~19 minutes/i)).toBeInTheDocument()

      // Change work duration to 4 minutes
      const workDurationSlider = screen.getByLabelText(/work duration/i)
      await user.clear(workDurationSlider)
      await user.type(workDurationSlider, '240')

      // Should update preview: (4 + 1) * 5 - 1 = 24 minutes
      expect(screen.getByText(/total workout: ~24 minutes/i)).toBeInTheDocument()
    })
  })

  describe('Audio Settings', () => {
    /**
     * Test volume control
     * Business Rule: Volume should be adjustable from 0-100%
     */
    test('should handle volume changes', async () => {
      const user = userEvent.setup()
      render(<SettingsDialog {...defaultProps} />)

      const volumeSlider = screen.getByLabelText(/volume/i)
      expect(volumeSlider).toHaveValue('80') // 0.8 * 100

      // Change volume to 60%
      fireEvent.change(volumeSlider, { target: { value: '60' } })

      const saveButton = screen.getByRole('button', { name: /save settings/i })
      await user.click(saveButton)

      expect(mockOnAudioSettingsChange).toHaveBeenCalledWith({
        ...defaultAudioSettings,
        volume: 0.6
      })
    })

    /**
     * Test mute toggle
     * Business Rule: Audio should be mutable/unmutable
     */
    test('should handle mute toggle', async () => {
      const user = userEvent.setup()
      render(<SettingsDialog {...defaultProps} />)

      const muteToggle = screen.getByRole('checkbox', { name: /mute audio/i })
      expect(muteToggle).not.toBeChecked()

      await user.click(muteToggle)

      const saveButton = screen.getByRole('button', { name: /save settings/i })
      await user.click(saveButton)

      expect(mockOnAudioSettingsChange).toHaveBeenCalledWith({
        ...defaultAudioSettings,
        isMuted: true
      })
    })

    /**
     * Test sound selection
     * Business Rule: Users should be able to select different sound types
     */
    test('should handle sound selection changes', async () => {
      const user = userEvent.setup()
      render(<SettingsDialog {...defaultProps} />)

      // Change bell sound
      const bellSoundSelect = screen.getByLabelText(/bell sound/i)
      await user.selectOptions(bellSoundSelect, 'boxing')

      // Change beep sound  
      const beepSoundSelect = screen.getByLabelText(/beep sound/i)
      await user.selectOptions(beepSoundSelect, 'whistle')

      const saveButton = screen.getByRole('button', { name: /save settings/i })
      await user.click(saveButton)

      expect(mockOnAudioSettingsChange).toHaveBeenCalledWith({
        ...defaultAudioSettings,
        bellSound: 'boxing',
        beepSound: 'whistle'
      })
    })

    /**
     * Test audio preview functionality
     * Business Rule: Users should be able to preview selected sounds
     */
    test('should allow audio preview', async () => {
      const user = userEvent.setup()
      render(<SettingsDialog {...defaultProps} />)

      const previewBellButton = screen.getByRole('button', { name: /preview bell sound/i })
      await user.click(previewBellButton)

      expect(mockAudioManager.play).toHaveBeenCalledWith('bell')

      const previewBeepButton = screen.getByRole('button', { name: /preview beep sound/i })
      await user.click(previewBeepButton)

      expect(mockAudioManager.play).toHaveBeenCalledWith('beep')
    })

    /**
     * Test volume control with mute interaction
     * Business Rule: Volume control should be disabled when muted
     */
    test('should disable volume control when muted', async () => {
      const user = userEvent.setup()
      const mutedProps = {
        ...defaultProps,
        audioSettings: { ...defaultAudioSettings, isMuted: true }
      }

      render(<SettingsDialog {...mutedProps} />)

      const volumeSlider = screen.getByLabelText(/volume/i)
      expect(volumeSlider).toBeDisabled()

      // Unmute should re-enable volume control
      const muteToggle = screen.getByRole('checkbox', { name: /mute audio/i })
      await user.click(muteToggle)

      expect(volumeSlider).toBeEnabled()
    })
  })

  describe('Theme and Display Settings', () => {
    /**
     * Test theme selection
     * Business Rule: Users should be able to choose between light/dark/auto themes
     */
    test('should handle theme selection', async () => {
      const user = userEvent.setup()
      const mockOnThemeChange = jest.fn()
      
      render(
        <SettingsDialog 
          {...defaultProps}
          onThemeChange={mockOnThemeChange}
          currentTheme="light"
        />
      )

      const themeSelect = screen.getByLabelText(/theme/i)
      await user.selectOptions(themeSelect, 'dark')

      const saveButton = screen.getByRole('button', { name: /save settings/i })
      await user.click(saveButton)

      expect(mockOnThemeChange).toHaveBeenCalledWith('dark')
    })

    /**
     * Test display size preferences
     * Business Rule: Timer display size should be configurable
     */
    test('should handle display size changes', async () => {
      const user = userEvent.setup()
      const mockOnDisplaySettingsChange = jest.fn()
      
      render(
        <SettingsDialog 
          {...defaultProps}
          onDisplaySettingsChange={mockOnDisplaySettingsChange}
          displaySettings={{ size: 'large', showProgress: true }}
        />
      )

      const sizeSelect = screen.getByLabelText(/display size/i)
      await user.selectOptions(sizeSelect, 'extra-large')

      const saveButton = screen.getByRole('button', { name: /save settings/i })
      await user.click(saveButton)

      expect(mockOnDisplaySettingsChange).toHaveBeenCalledWith({
        size: 'extra-large',
        showProgress: true
      })
    })

    /**
     * Test progress indicator toggle
     * Business Rule: Progress indicators should be toggleable
     */
    test('should handle progress indicator toggle', async () => {
      const user = userEvent.setup()
      const mockOnDisplaySettingsChange = jest.fn()
      
      render(
        <SettingsDialog 
          {...defaultProps}
          onDisplaySettingsChange={mockOnDisplaySettingsChange}
          displaySettings={{ size: 'large', showProgress: true }}
        />
      )

      const progressToggle = screen.getByRole('checkbox', { name: /show progress/i })
      expect(progressToggle).toBeChecked()

      await user.click(progressToggle)

      const saveButton = screen.getByRole('button', { name: /save settings/i })
      await user.click(saveButton)

      expect(mockOnDisplaySettingsChange).toHaveBeenCalledWith({
        size: 'large',
        showProgress: false
      })
    })
  })

  describe('Data Persistence', () => {
    /**
     * Test settings save to localStorage
     * Business Rule: Settings should persist across browser sessions
     */
    test('should save settings to localStorage', async () => {
      const user = userEvent.setup()
      render(<SettingsDialog {...defaultProps} />)

      // Change multiple settings
      const workDurationSlider = screen.getByLabelText(/work duration/i)
      await user.clear(workDurationSlider)
      await user.type(workDurationSlider, '240')

      const volumeSlider = screen.getByLabelText(/volume/i)
      fireEvent.change(volumeSlider, { target: { value: '70' } })

      const saveButton = screen.getByRole('button', { name: /save settings/i })
      await user.click(saveButton)

      // Should save to localStorage
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'boxing-timer-config',
        expect.stringContaining('"workDuration":240')
      )
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'boxing-timer-audio',
        expect.stringContaining('"volume":0.7')
      )
    })

    /**
     * Test settings load from localStorage
     * Business Rule: Saved settings should be restored on app load
     */
    test('should load settings from localStorage', () => {
      const savedConfig = JSON.stringify({
        workDuration: 300,
        restDuration: 90,
        totalRounds: 8,
        enableWarning: false
      })

      const savedAudio = JSON.stringify({
        volume: 0.5,
        isMuted: true,
        bellSound: 'boxing',
        beepSound: 'whistle'
      })

      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'boxing-timer-config') return savedConfig
        if (key === 'boxing-timer-audio') return savedAudio
        return null
      })

      render(<SettingsDialog {...defaultProps} />)

      // Should display loaded values
      expect(screen.getByLabelText(/work duration/i)).toHaveValue('300')
      expect(screen.getByLabelText(/rest duration/i)).toHaveValue('90')
      expect(screen.getByLabelText(/total rounds/i)).toHaveValue('8')
      expect(screen.getByRole('checkbox', { name: /10-second warning/i })).not.toBeChecked()
      
      expect(screen.getByLabelText(/volume/i)).toHaveValue('50')
      expect(screen.getByRole('checkbox', { name: /mute audio/i })).toBeChecked()
    })

    /**
     * Test settings reset functionality
     * Business Rule: Users should be able to reset to defaults
     */
    test('should reset settings to defaults', async () => {
      const user = userEvent.setup()
      render(<SettingsDialog {...defaultProps} />)

      // Change some settings first
      const workDurationSlider = screen.getByLabelText(/work duration/i)
      await user.clear(workDurationSlider)
      await user.type(workDurationSlider, '600')

      // Reset to defaults
      const resetButton = screen.getByRole('button', { name: /reset to defaults/i })
      await user.click(resetButton)

      // Should show confirmation dialog
      expect(screen.getByRole('dialog', { name: /confirm reset/i })).toBeInTheDocument()
      
      const confirmButton = screen.getByRole('button', { name: /yes, reset/i })
      await user.click(confirmButton)

      // Should restore default values
      expect(screen.getByLabelText(/work duration/i)).toHaveValue('180')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('boxing-timer-config')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('boxing-timer-audio')
    })
  })

  describe('Mobile and Responsive Design', () => {
    /**
     * Test mobile layout adaptation
     * Business Rule: Settings dialog should adapt to mobile screens
     */
    test('should use mobile layout on small screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      })

      render(<SettingsDialog {...defaultProps} isMobile={true} />)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveClass('settings-dialog--mobile')

      // Settings should be organized in mobile-friendly sections
      expect(screen.getByRole('tablist')).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /timer/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /audio/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /display/i })).toBeInTheDocument()
    })

    /**
     * Test touch-friendly controls
     * Business Rule: All controls should be touch-friendly on mobile
     */
    test('should have touch-friendly controls', () => {
      render(<SettingsDialog {...defaultProps} touchOptimized={true} />)

      const sliders = screen.getAllByRole('slider')
      const buttons = screen.getAllByRole('button')
      const checkboxes = screen.getAllByRole('checkbox')

      // All interactive elements should have touch-friendly sizing
      [...sliders, ...buttons, ...checkboxes].forEach(element => {
        expect(element).toHaveClass('touch-optimized')
      })
    })

    /**
     * Test swipe navigation for mobile tabs
     * Business Rule: Mobile users should be able to swipe between setting tabs
     */
    test('should support swipe navigation between tabs', async () => {
      render(<SettingsDialog {...defaultProps} isMobile={true} />)

      const tabContainer = screen.getByTestId('settings-tabs')

      // Simulate swipe left
      fireEvent.touchStart(tabContainer, {
        touches: [{ clientX: 100, clientY: 100 }]
      })
      fireEvent.touchMove(tabContainer, {
        touches: [{ clientX: 50, clientY: 100 }]
      })
      fireEvent.touchEnd(tabContainer)

      // Should switch to next tab
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /audio/i })).toHaveAttribute('aria-selected', 'true')
      })
    })
  })

  describe('Accessibility Features', () => {
    /**
     * Test ARIA labels and roles
     * Business Rule: Settings dialog must be fully accessible
     */
    test('should have proper ARIA labels and roles', () => {
      render(<SettingsDialog {...defaultProps} />)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAccessibleName(/timer settings/i)
      expect(dialog).toHaveAttribute('aria-describedby')

      // Form controls should have proper labels
      expect(screen.getByLabelText(/work duration/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/rest duration/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/total rounds/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/volume/i)).toBeInTheDocument()
    })

    /**
     * Test keyboard navigation within dialog
     * Business Rule: All settings should be keyboard accessible
     */
    test('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<SettingsDialog {...defaultProps} />)

      // Should be able to navigate through all form controls
      await user.tab()
      expect(screen.getByLabelText(/work duration/i)).toHaveFocus()

      await user.tab()
      expect(screen.getByLabelText(/rest duration/i)).toHaveFocus()

      await user.tab()
      expect(screen.getByLabelText(/total rounds/i)).toHaveFocus()

      // Should be able to adjust sliders with arrow keys
      const workDurationSlider = screen.getByLabelText(/work duration/i)
      workDurationSlider.focus()
      
      await user.keyboard('{ArrowRight}')
      expect(parseInt(workDurationSlider.value)).toBeGreaterThan(180)
    })

    /**
     * Test screen reader announcements
     * Business Rule: Setting changes should be announced to screen readers
     */
    test('should announce setting changes to screen readers', async () => {
      const user = userEvent.setup()
      render(<SettingsDialog {...defaultProps} />)

      const workDurationSlider = screen.getByLabelText(/work duration/i)
      await user.clear(workDurationSlider)
      await user.type(workDurationSlider, '240')

      // Should announce the change
      const liveRegion = screen.getByRole('status')
      expect(liveRegion).toHaveTextContent(/work duration changed to 4 minutes/i)
    })

    /**
     * Test color contrast and high contrast mode
     * Business Rule: Settings should be readable in high contrast mode
     */
    test('should support high contrast mode', () => {
      render(
        <div data-theme="high-contrast">
          <SettingsDialog {...defaultProps} />
        </div>
      )

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveClass('settings-dialog--high-contrast')

      // Text elements should have proper contrast classes
      const labels = screen.getAllByText(/duration|rounds|volume/i)
      labels.forEach(label => {
        expect(label).toHaveClass('high-contrast-text')
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    /**
     * Test handling of corrupted localStorage data
     * Business Rule: Corrupted settings should fall back to defaults
     */
    test('should handle corrupted localStorage data gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json data')

      expect(() => {
        render(<SettingsDialog {...defaultProps} />)
      }).not.toThrow()

      // Should use default values
      expect(screen.getByLabelText(/work duration/i)).toHaveValue('180')
      expect(screen.getByLabelText(/volume/i)).toHaveValue('80')
    })

    /**
     * Test handling of missing callback functions
     * Business Rule: Component should handle missing callbacks gracefully
     */
    test('should handle missing callback functions', async () => {
      const user = userEvent.setup()
      
      render(
        <SettingsDialog 
          {...defaultProps}
          onConfigChange={undefined as any}
          onAudioSettingsChange={undefined as any}
        />
      )

      const saveButton = screen.getByRole('button', { name: /save settings/i })
      
      // Should not crash when callbacks are missing
      expect(() => user.click(saveButton)).not.toThrow()

      // Save button should be disabled
      expect(saveButton).toBeDisabled()
    })

    /**
     * Test handling of audio system errors
     * Business Rule: Audio preview errors should not crash the dialog
     */
    test('should handle audio system errors gracefully', async () => {
      const user = userEvent.setup()
      
      mockAudioManager.play.mockRejectedValue(new Error('Audio failed'))

      render(<SettingsDialog {...defaultProps} />)

      const previewButton = screen.getByRole('button', { name: /preview bell sound/i })
      
      // Should not crash when audio preview fails
      await expect(user.click(previewButton)).resolves.toBeUndefined()

      // Should show error message
      expect(screen.getByRole('alert')).toHaveTextContent(/audio preview failed/i)
    })
  })
})