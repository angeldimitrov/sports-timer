/**
 * Unit Tests for TimerControls Component
 * 
 * Tests button height consistency, 2-button layout functionality,
 * and proper rendering across all timer states.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TimerControls } from '../timer-controls';
import { UseTimerReturn } from '@/hooks/use-timer';

// Mock framer-motion to avoid animation complexities in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: React.ComponentProps<'button'> & { whileHover?: unknown; whileTap?: unknown }) => (
      <button {...props}>{children}</button>
    ),
  },
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Play: ({ className, ...props }: React.ComponentProps<'span'>) => <span data-testid="play-icon" className={className} {...props}>Play</span>,
  Pause: ({ className, ...props }: React.ComponentProps<'span'>) => <span data-testid="pause-icon" className={className} {...props}>Pause</span>,
  Square: ({ className, ...props }: React.ComponentProps<'span'>) => <span data-testid="square-icon" className={className} {...props}>Square</span>,
  RotateCcw: ({ className, ...props }: React.ComponentProps<'span'>) => <span data-testid="rotate-icon" className={className} {...props}>Rotate</span>,
}));

describe('TimerControls Component', () => {
  // Create mock timer objects for different states
  const createMockTimer = (overrides: Partial<UseTimerReturn> = {}): UseTimerReturn => ({
    // Timer state
    isIdle: false,
    isRunning: false,
    isPaused: false,
    isCompleted: false,
    isReady: true,
    currentPhase: 'preparation',
    
    // Timer data
    timeRemaining: 60,
    totalTime: 120,
    currentRound: 1,
    
    // Timer configuration
    config: {
      totalRounds: 3,
      workDuration: 120,
      restDuration: 60,
      preparationTime: 10,
      warningDuration: 10,
    },
    
    // Timer controls
    start: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    stop: jest.fn(),
    reset: jest.fn(),
    updateConfig: jest.fn(),
    
    // Progress tracking
    workoutProgress: 0.25,
    roundProgress: 0.5,
    ...overrides,
  });

  describe('Button Height Consistency', () => {
    it('should render all buttons with h-14 (56px) height in IDLE state', () => {
      const mockTimer = createMockTimer({ isIdle: true, isReady: true });
      render(<TimerControls timer={mockTimer} />);
      
      const startButton = screen.getByRole('button', { name: /start/i });
      expect(startButton).toHaveClass('h-14');
    });

    it('should render all buttons with h-14 (56px) height in RUNNING state', () => {
      const mockTimer = createMockTimer({ isRunning: true, isReady: true });
      render(<TimerControls timer={mockTimer} />);
      
      const pauseButton = screen.getByRole('button', { name: /pause/i });
      const stopButton = screen.getByRole('button', { name: /stop/i });
      
      expect(pauseButton).toHaveClass('h-14');
      expect(stopButton).toHaveClass('h-14');
    });

    it('should render all buttons with h-14 (56px) height in PAUSED state', () => {
      const mockTimer = createMockTimer({ isPaused: true, isReady: true });
      render(<TimerControls timer={mockTimer} />);
      
      const resumeButton = screen.getByRole('button', { name: /resume/i });
      const stopButton = screen.getByRole('button', { name: /stop/i });
      
      expect(resumeButton).toHaveClass('h-14');
      expect(stopButton).toHaveClass('h-14');
    });

    it('should render all buttons with h-14 (56px) height in COMPLETED state', () => {
      const mockTimer = createMockTimer({ isCompleted: true, isReady: true });
      render(<TimerControls timer={mockTimer} />);
      
      const restartButton = screen.getByRole('button', { name: /restart/i });
      expect(restartButton).toHaveClass('h-14');
    });
  });

  describe('Dynamic 2-Button Layout', () => {
    it('should show only START button in IDLE state', () => {
      const mockTimer = createMockTimer({ isIdle: true, isReady: true });
      render(<TimerControls timer={mockTimer} />);
      
      expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /pause/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /stop/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument();
    });

    it('should show PAUSE and STOP buttons in RUNNING state', () => {
      const mockTimer = createMockTimer({ isRunning: true, isReady: true });
      render(<TimerControls timer={mockTimer} />);
      
      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /start/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /resume/i })).not.toBeInTheDocument();
    });

    it('should show RESUME and STOP buttons in PAUSED state', () => {
      const mockTimer = createMockTimer({ isPaused: true, isReady: true });
      render(<TimerControls timer={mockTimer} />);
      
      expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /start/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /pause/i })).not.toBeInTheDocument();
    });

    it('should show only RESTART button in COMPLETED state', () => {
      const mockTimer = createMockTimer({ 
        isCompleted: true, 
        isReady: true,
        isIdle: false, 
        isRunning: false, 
        isPaused: false 
      });
      render(<TimerControls timer={mockTimer} />);
      
      expect(screen.getByRole('button', { name: /restart/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^start$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /pause/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /stop/i })).not.toBeInTheDocument();
    });
  });

  describe('Icon Sizing Consistency', () => {
    it('should render primary button icons with proper size classes', () => {
      const mockTimer = createMockTimer({ isIdle: true, isReady: true });
      const { container } = render(<TimerControls timer={mockTimer} />);
      
      // Check that w-5 h-5 classes exist in the component for primary icons
      const primaryIconElement = container.querySelector('.w-5.h-5');
      expect(primaryIconElement).toBeInTheDocument();
    });

    it('should render primary icons correctly in split layout', () => {
      const mockTimer = createMockTimer({ isRunning: true, isReady: true });
      const { container } = render(<TimerControls timer={mockTimer} />);
      
      // Check that w-5 h-5 classes exist for primary button in split layout
      const primaryIconElement = container.querySelector('.w-5.h-5');
      expect(primaryIconElement).toBeInTheDocument();
    });

    it('should render secondary button icons with smaller size', () => {
      const mockTimer = createMockTimer({ isRunning: true, isReady: true });
      const { container } = render(<TimerControls timer={mockTimer} />);
      
      // Check that w-4 h-4 classes exist for secondary icons
      const secondaryIconElement = container.querySelector('.w-4.h-4');
      expect(secondaryIconElement).toBeInTheDocument();
    });
  });

  describe('Button Layout Proportions', () => {
    it('should use full width for single buttons', () => {
      const mockTimer = createMockTimer({ isIdle: true, isReady: true });
      render(<TimerControls timer={mockTimer} />);
      
      const startButton = screen.getByRole('button', { name: /start/i });
      expect(startButton).toHaveClass('w-full');
    });

    it('should use 70%/30% split layout for running state buttons', () => {
      const mockTimer = createMockTimer({ isRunning: true, isReady: true });
      const { container } = render(<TimerControls timer={mockTimer} />);
      
      // Check for flex layout with proper proportions
      const flexContainer = container.querySelector('.flex.gap-2');
      expect(flexContainer).toBeInTheDocument();
      
      const primaryContainer = flexContainer?.querySelector('.flex-\\[7\\]');
      const secondaryContainer = flexContainer?.querySelector('.flex-\\[3\\]');
      
      expect(primaryContainer).toBeInTheDocument();
      expect(secondaryContainer).toBeInTheDocument();
    });
  });

  describe('Button Functionality', () => {
    it('should call timer.start when START button is clicked', async () => {
      const mockTimer = createMockTimer({ isIdle: true, isReady: true });
      render(<TimerControls timer={mockTimer} />);
      
      const startButton = screen.getByRole('button', { name: /start/i });
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(mockTimer.start).toHaveBeenCalledTimes(1);
      });
    });

    it('should call timer.pause when PAUSE button is clicked', async () => {
      const mockTimer = createMockTimer({ isRunning: true, isReady: true });
      render(<TimerControls timer={mockTimer} />);
      
      const pauseButton = screen.getByRole('button', { name: /pause/i });
      fireEvent.click(pauseButton);
      
      await waitFor(() => {
        expect(mockTimer.pause).toHaveBeenCalledTimes(1);
      });
    });

    it('should call timer.resume when RESUME button is clicked', async () => {
      const mockTimer = createMockTimer({ isPaused: true, isReady: true });
      render(<TimerControls timer={mockTimer} />);
      
      const resumeButton = screen.getByRole('button', { name: /resume/i });
      fireEvent.click(resumeButton);
      
      await waitFor(() => {
        expect(mockTimer.resume).toHaveBeenCalledTimes(1);
      });
    });

    it('should call timer.stop when STOP button is clicked', async () => {
      const mockTimer = createMockTimer({ isRunning: true, isReady: true });
      render(<TimerControls timer={mockTimer} />);
      
      const stopButton = screen.getByRole('button', { name: /stop/i });
      fireEvent.click(stopButton);
      
      await waitFor(() => {
        expect(mockTimer.stop).toHaveBeenCalledTimes(1);
      });
    });

    it('should call timer.reset when RESTART button is clicked', async () => {
      const mockTimer = createMockTimer({ isCompleted: true, isReady: true });
      render(<TimerControls timer={mockTimer} />);
      
      const restartButton = screen.getByRole('button', { name: /restart/i });
      fireEvent.click(restartButton);
      
      await waitFor(() => {
        expect(mockTimer.reset).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Disabled State Handling', () => {
    it('should disable buttons when timer is not ready', () => {
      const mockTimer = createMockTimer({ isIdle: true, isReady: false });
      render(<TimerControls timer={mockTimer} />);
      
      const startButton = screen.getByRole('button', { name: /start/i });
      expect(startButton).toBeDisabled();
    });

    it('should apply disabled styling when buttons are disabled', () => {
      const mockTimer = createMockTimer({ isIdle: true, isReady: false });
      render(<TimerControls timer={mockTimer} />);
      
      const startButton = screen.getByRole('button', { name: /start/i });
      expect(startButton).toHaveClass('disabled:opacity-50');
    });
  });

  describe('CSS Classes and Styling', () => {
    it('should apply correct color classes for different button types', () => {
      const mockTimer = createMockTimer({ isRunning: true, isReady: true });
      render(<TimerControls timer={mockTimer} />);
      
      const pauseButton = screen.getByRole('button', { name: /pause/i });
      const stopButton = screen.getByRole('button', { name: /stop/i });
      
      expect(pauseButton).toHaveClass('bg-orange-600');
      expect(stopButton).toHaveClass('glass');
    });

    it('should maintain responsive design classes', () => {
      const mockTimer = createMockTimer({ isIdle: true, isReady: true });
      render(<TimerControls timer={mockTimer} />);
      
      const startButton = screen.getByRole('button', { name: /start/i });
      expect(startButton).toHaveClass('rounded-lg', 'text-base', 'font-bold');
    });
  });

  describe('Accessibility', () => {
    it('should have proper button roles and labels', () => {
      const mockTimer = createMockTimer({ isRunning: true, isReady: true });
      render(<TimerControls timer={mockTimer} />);
      
      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
    });

    it('should be keyboard accessible', () => {
      const mockTimer = createMockTimer({ isIdle: true, isReady: true });
      render(<TimerControls timer={mockTimer} />);
      
      const startButton = screen.getByRole('button', { name: /start/i });
      startButton.focus();
      expect(startButton).toHaveFocus();
    });
  });
});