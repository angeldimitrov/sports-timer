/**
 * Integration Tests for PresetSelector Component
 * 
 * Tests the PresetSelector component integration with preset persistence
 * and custom preset system.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PresetSelector } from '../preset-selector';
import { TimerConfig } from '@/lib/timer-engine';

// Mock the custom preset functions
jest.mock('@/lib/custom-preset', () => ({
  getCustomPresetDisplayInfo: jest.fn(() => null),
}));

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>) => <div {...props}>{children}</div>,
  },
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Dumbbell: () => <span data-testid="dumbbell-icon">Dumbbell</span>,
  Users: () => <span data-testid="users-icon">Users</span>,
  Target: () => <span data-testid="target-icon">Target</span>,
  Settings: () => <span data-testid="settings-icon">Settings</span>,
  Plus: () => <span data-testid="plus-icon">Plus</span>,
}));

const createMockConfig = (): TimerConfig => ({
  totalRounds: 5,
  workDuration: 180,
  restDuration: 60,
  prepDuration: 10,
  enableWarning: true,
  warningDuration: 10
});

describe('PresetSelector Integration Tests', () => {
  const mockOnPresetSelect = jest.fn();
  const mockOnCustomPresetEdit = jest.fn();
  const mockOnCustomPresetCreate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Standard Preset Selection', () => {
    it('should render all standard presets correctly', () => {
      render(
        <PresetSelector
          currentConfig={createMockConfig()}
          selectedPreset="beginner"
          onPresetSelect={mockOnPresetSelect}
          onCustomPresetEdit={mockOnCustomPresetEdit}
          onCustomPresetCreate={mockOnCustomPresetCreate}
          isInitialized={true}
        />
      );

      expect(screen.getByText('Beginner')).toBeInTheDocument();
      expect(screen.getByText('Intermediate')).toBeInTheDocument();
      expect(screen.getByText('Advanced')).toBeInTheDocument();
    });

    it('should show selected preset with visual indicators', () => {
      render(
        <PresetSelector
          currentConfig={createMockConfig()}
          selectedPreset="intermediate"
          onPresetSelect={mockOnPresetSelect}
          onCustomPresetEdit={mockOnCustomPresetEdit}
          onCustomPresetCreate={mockOnCustomPresetCreate}
          isInitialized={true}
        />
      );

      const intermediateButton = screen.getByRole('button', { name: /intermediate/i });
      expect(intermediateButton).toHaveClass('ring-blue-500'); // Selected state styling
    });

    it('should call onPresetSelect when preset is clicked', () => {
      render(
        <PresetSelector
          currentConfig={createMockConfig()}
          selectedPreset="beginner"
          onPresetSelect={mockOnPresetSelect}
          onCustomPresetEdit={mockOnCustomPresetEdit}
          onCustomPresetCreate={mockOnCustomPresetCreate}
          isInitialized={true}
        />
      );

      fireEvent.click(screen.getByText('Advanced'));
      expect(mockOnPresetSelect).toHaveBeenCalledWith('advanced');
    });

    it('should disable preset selection when disabled prop is true', () => {
      render(
        <PresetSelector
          currentConfig={createMockConfig()}
          selectedPreset="beginner"
          onPresetSelect={mockOnPresetSelect}
          onCustomPresetEdit={mockOnCustomPresetEdit}
          onCustomPresetCreate={mockOnCustomPresetCreate}
          disabled={true}
          isInitialized={true}
        />
      );

      const beginnerButton = screen.getByRole('button', { name: /beginner/i });
      expect(beginnerButton).toBeDisabled();
    });
  });

  describe('Custom Preset Integration', () => {
    it('should show create custom preset option when no custom preset exists', () => {
      render(
        <PresetSelector
          currentConfig={createMockConfig()}
          selectedPreset="beginner"
          onPresetSelect={mockOnPresetSelect}
          onCustomPresetEdit={mockOnCustomPresetEdit}
          onCustomPresetCreate={mockOnCustomPresetCreate}
          isInitialized={true}
        />
      );

      expect(screen.getByText('Create Custom Preset')).toBeInTheDocument();
      expect(screen.getByText('Configure your own workout settings')).toBeInTheDocument();
    });

    it('should call onCustomPresetCreate when create button is clicked', () => {
      render(
        <PresetSelector
          currentConfig={createMockConfig()}
          selectedPreset="beginner"
          onPresetSelect={mockOnPresetSelect}
          onCustomPresetEdit={mockOnCustomPresetEdit}
          onCustomPresetCreate={mockOnCustomPresetCreate}
          isInitialized={true}
        />
      );

      fireEvent.click(screen.getByText('Create Custom Preset'));
      expect(mockOnCustomPresetCreate).toHaveBeenCalled();
    });

    it('should show existing custom preset when available', () => {
      // Mock existing custom preset
      const mockCustomPreset = {
        name: 'My Custom Workout',
        rounds: 8,
        workDuration: 240,
        restDuration: 90,
        totalTime: '38:30'
      };

      jest.requireMock('@/lib/custom-preset').getCustomPresetDisplayInfo.mockReturnValue(mockCustomPreset);

      render(
        <PresetSelector
          currentConfig={createMockConfig()}
          selectedPreset="custom"
          onPresetSelect={mockOnPresetSelect}
          onCustomPresetEdit={mockOnCustomPresetEdit}
          onCustomPresetCreate={mockOnCustomPresetCreate}
          isInitialized={true}
        />
      );

      expect(screen.getByText('My Custom Workout')).toBeInTheDocument();
      expect(screen.getByText('8 rounds')).toBeInTheDocument();
      expect(screen.getByText('38:30')).toBeInTheDocument();
      expect(screen.getByText('Edit Preset')).toBeInTheDocument();
    });

    it('should call onCustomPresetEdit when edit button is clicked', () => {
      const mockCustomPreset = {
        name: 'My Custom Workout',
        rounds: 8,
        workDuration: 240,
        restDuration: 90,
        totalTime: '38:30'
      };

      jest.requireMock('@/lib/custom-preset').getCustomPresetDisplayInfo.mockReturnValue(mockCustomPreset);

      render(
        <PresetSelector
          currentConfig={createMockConfig()}
          selectedPreset="custom"
          onPresetSelect={mockOnPresetSelect}
          onCustomPresetEdit={mockOnCustomPresetEdit}
          onCustomPresetCreate={mockOnCustomPresetCreate}
          isInitialized={true}
        />
      );

      fireEvent.click(screen.getByText('Edit Preset'));
      expect(mockOnCustomPresetEdit).toHaveBeenCalled();
    });

    it('should show custom preset as selected when selectedPreset is custom', () => {
      const mockCustomPreset = {
        name: 'My Custom Workout',
        rounds: 8,
        workDuration: 240,
        restDuration: 90,
        totalTime: '38:30'
      };

      jest.requireMock('@/lib/custom-preset').getCustomPresetDisplayInfo.mockReturnValue(mockCustomPreset);

      render(
        <PresetSelector
          currentConfig={createMockConfig()}
          selectedPreset="custom"
          onPresetSelect={mockOnPresetSelect}
          onCustomPresetEdit={mockOnCustomPresetEdit}
          onCustomPresetCreate={mockOnCustomPresetCreate}
          isInitialized={true}
        />
      );

      const customButton = screen.getByRole('button', { name: /my custom workout/i });
      expect(customButton).toHaveClass('ring-indigo-500'); // Custom preset selected state
    });
  });

  describe('Loading and Initialization States', () => {
    it('should render without crashing when not initialized', () => {
      render(
        <PresetSelector
          currentConfig={createMockConfig()}
          selectedPreset={null}
          onPresetSelect={mockOnPresetSelect}
          onCustomPresetEdit={mockOnCustomPresetEdit}
          onCustomPresetCreate={mockOnCustomPresetCreate}
          isInitialized={false}
        />
      );

      // Should render component without crashing
      expect(document.body).toBeInTheDocument();
    });

    it('should render correctly when selectedPreset is null during initialization', () => {
      render(
        <PresetSelector
          currentConfig={createMockConfig()}
          selectedPreset={null}
          onPresetSelect={mockOnPresetSelect}
          onCustomPresetEdit={mockOnCustomPresetEdit}
          onCustomPresetCreate={mockOnCustomPresetCreate}
          isInitialized={false}
        />
      );

      // Should not crash and should render component
      expect(document.querySelector('.space-y-4')).toBeInTheDocument();
    });
  });

  describe('Mutual Exclusivity Validation', () => {
    it('should only show one preset as selected at a time', () => {
      render(
        <PresetSelector
          currentConfig={createMockConfig()}
          selectedPreset="intermediate"
          onPresetSelect={mockOnPresetSelect}
          onCustomPresetEdit={mockOnCustomPresetEdit}
          onCustomPresetCreate={mockOnCustomPresetCreate}
          isInitialized={true}
        />
      );

      // Only intermediate should have selected styling
      const intermediateButton = screen.getByRole('button', { name: /intermediate/i });
      const beginnerButton = screen.getByRole('button', { name: /beginner/i });
      const advancedButton = screen.getByRole('button', { name: /advanced/i });

      expect(intermediateButton).toHaveClass('ring-blue-500');
      expect(beginnerButton).not.toHaveClass('ring-green-500');
      expect(advancedButton).not.toHaveClass('ring-purple-500');
    });

    it('should not show standard presets as selected when custom is selected', () => {
      const mockCustomPreset = {
        name: 'My Custom Workout',
        rounds: 8,
        workDuration: 240,
        restDuration: 90,
        totalTime: '38:30'
      };

      jest.requireMock('@/lib/custom-preset').getCustomPresetDisplayInfo.mockReturnValue(mockCustomPreset);

      render(
        <PresetSelector
          currentConfig={createMockConfig()}
          selectedPreset="custom"
          onPresetSelect={mockOnPresetSelect}
          onCustomPresetEdit={mockOnCustomPresetEdit}
          onCustomPresetCreate={mockOnCustomPresetCreate}
          isInitialized={true}
        />
      );

      // No standard presets should have selected styling
      const beginnerButton = screen.getByRole('button', { name: /beginner/i });
      const intermediateButton = screen.getByRole('button', { name: /intermediate/i });
      const advancedButton = screen.getByRole('button', { name: /advanced/i });

      expect(beginnerButton).not.toHaveClass('ring-green-500');
      expect(intermediateButton).not.toHaveClass('ring-blue-500');
      expect(advancedButton).not.toHaveClass('ring-purple-500');

      // Only custom should be selected
      const customButton = screen.getByRole('button', { name: /my custom workout/i });
      expect(customButton).toHaveClass('ring-indigo-500');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <PresetSelector
          currentConfig={createMockConfig()}
          selectedPreset="beginner"
          onPresetSelect={mockOnPresetSelect}
          onCustomPresetEdit={mockOnCustomPresetEdit}
          onCustomPresetCreate={mockOnCustomPresetCreate}
          isInitialized={true}
        />
      );

      // All preset buttons should be accessible
      expect(screen.getByRole('button', { name: /beginner/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /intermediate/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /advanced/i })).toBeInTheDocument();
    });

    it('should be focusable and clickable', () => {
      render(
        <PresetSelector
          currentConfig={createMockConfig()}
          selectedPreset="beginner"
          onPresetSelect={mockOnPresetSelect}
          onCustomPresetEdit={mockOnCustomPresetEdit}
          onCustomPresetCreate={mockOnCustomPresetCreate}
          isInitialized={true}
        />
      );

      const beginnerButton = screen.getByRole('button', { name: /beginner/i });
      
      // Should be focusable
      beginnerButton.focus();
      expect(beginnerButton).toHaveFocus();

      // Should respond to clicks
      fireEvent.click(beginnerButton);
      expect(mockOnPresetSelect).toHaveBeenCalledWith('beginner');
    });
  });
});