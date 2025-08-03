/**
 * Integration Tests for PresetSelector Component
 * 
 * Tests the PresetSelector component with standard presets.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PresetSelector } from '../preset-selector';
import { TimerConfig } from '@/lib/timer-engine';


// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children, ...props }: React.PropsWithChildren<unknown>) => <div {...props}>{children}</div>,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Dumbbell: () => <span data-testid="dumbbell-icon">Dumbbell</span>,
  Users: () => <span data-testid="users-icon">Users</span>,
  Target: () => <span data-testid="target-icon">Target</span>,
  Settings: () => <span data-testid="settings-icon">Settings</span>,
  Plus: () => <span data-testid="plus-icon">Plus</span>,
  Check: () => <span data-testid="check-icon">Check</span>,
}));

// Mock shadcn/ui Button component
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<React.ButtonHTMLAttributes<HTMLButtonElement>>) => 
    <button {...props}>{children}</button>,
}));

// Mock utils
jest.mock('@/lib/utils', () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(' '),
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Standard Preset Selection', () => {
    it('should render all standard presets correctly', () => {
      render(
        <PresetSelector
          currentConfig={createMockConfig()}
          onPresetSelect={mockOnPresetSelect}
        />
      );

      expect(screen.getByText('Beginner')).toBeInTheDocument();
      expect(screen.getByText('Intermediate')).toBeInTheDocument();
      expect(screen.getByText('Advanced')).toBeInTheDocument();
    });

    it('should show active preset with visual indicators when config matches', () => {
      // Create config that matches intermediate preset
      const intermediateConfig: TimerConfig = {
        totalRounds: 5,
        workDuration: 180,
        restDuration: 60,
        prepDuration: 10,
        enableWarning: true,
        warningDuration: 10
      };

      render(
        <PresetSelector
          currentConfig={intermediateConfig}
          onPresetSelect={mockOnPresetSelect}
        />
      );

      const intermediateButton = screen.getByRole('button', { name: /intermediate/i });
      expect(intermediateButton).toHaveClass('ring-blue-500'); // Selected state styling
    });

    it('should call onPresetSelect when preset is clicked', () => {
      render(
        <PresetSelector
          currentConfig={createMockConfig()}
          onPresetSelect={mockOnPresetSelect}
        />
      );

      fireEvent.click(screen.getByText('Advanced'));
      expect(mockOnPresetSelect).toHaveBeenCalledWith('advanced');
    });

    it('should disable preset selection when disabled prop is true', () => {
      render(
        <PresetSelector
          currentConfig={createMockConfig()}
          onPresetSelect={mockOnPresetSelect}
          disabled={true}
        />
      );

      const beginnerButton = screen.getByRole('button', { name: /beginner/i });
      expect(beginnerButton).toBeDisabled();
    });
  });

  describe('Custom Configuration Display', () => {
    it('should show custom configuration display when no preset matches', () => {
      // Create a config that doesn't match any preset
      const customConfig: TimerConfig = {
        totalRounds: 7,
        workDuration: 150,
        restDuration: 45,
        prepDuration: 10,
        enableWarning: true,
        warningDuration: 10
      };

      render(
        <PresetSelector
          currentConfig={customConfig}
          onPresetSelect={mockOnPresetSelect}
        />
      );

      expect(screen.getByText('Custom Configuration')).toBeInTheDocument();
      expect(screen.getByText('7 rounds')).toBeInTheDocument();
      expect(screen.getByText('150s work')).toBeInTheDocument();
      expect(screen.getByText('45s rest')).toBeInTheDocument();
    });

    it('should not show custom configuration when a preset matches', () => {
      // Create config that matches beginner preset
      const beginnerConfig: TimerConfig = {
        totalRounds: 3,
        workDuration: 120,
        restDuration: 60,
        prepDuration: 10,
        enableWarning: true,
        warningDuration: 10
      };

      render(
        <PresetSelector
          currentConfig={beginnerConfig}
          onPresetSelect={mockOnPresetSelect}
        />
      );

      expect(screen.queryByText('Custom Configuration')).not.toBeInTheDocument();
    });
  });

  describe('Component Rendering', () => {
    it('should render without crashing', () => {
      render(
        <PresetSelector
          currentConfig={createMockConfig()}
          onPresetSelect={mockOnPresetSelect}
        />
      );

      // Should render component without crashing
      expect(document.body).toBeInTheDocument();
    });

    it('should render the main container with proper styling', () => {
      render(
        <PresetSelector
          currentConfig={createMockConfig()}
          onPresetSelect={mockOnPresetSelect}
        />
      );

      // Should render component with proper structure
      expect(document.querySelector('.space-y-4')).toBeInTheDocument();
    });
  });

  describe('Active State Validation', () => {
    it('should only show one preset as active at a time', () => {
      // Create config that matches intermediate preset
      const intermediateConfig: TimerConfig = {
        totalRounds: 5,
        workDuration: 180,
        restDuration: 60,
        prepDuration: 10,
        enableWarning: true,
        warningDuration: 10
      };

      render(
        <PresetSelector
          currentConfig={intermediateConfig}
          onPresetSelect={mockOnPresetSelect}
        />
      );

      // Only intermediate should have active styling
      const intermediateButton = screen.getByRole('button', { name: /intermediate/i });
      const beginnerButton = screen.getByRole('button', { name: /beginner/i });
      const advancedButton = screen.getByRole('button', { name: /advanced/i });

      expect(intermediateButton).toHaveClass('ring-blue-500');
      expect(beginnerButton).not.toHaveClass('ring-green-500');
      expect(advancedButton).not.toHaveClass('ring-purple-500');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <PresetSelector
          currentConfig={createMockConfig()}
          onPresetSelect={mockOnPresetSelect}
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
          onPresetSelect={mockOnPresetSelect}
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