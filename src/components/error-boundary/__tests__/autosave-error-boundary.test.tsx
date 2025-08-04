/**
 * Tests for AutosaveErrorBoundary component - Basic error catching
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AutosaveErrorBoundary, useAutosaveErrorBoundary } from '../autosave-error-boundary';

// Component that throws an error for testing
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Component to test hook functionality
const HookTestComponent = () => {
  const { hasError, error, resetError, captureError } = useAutosaveErrorBoundary();
  
  return (
    <div>
      <div data-testid="error-status">{hasError ? 'Has Error' : 'No Error'}</div>
      <div data-testid="error-message">{error?.message || 'No Message'}</div>
      <button onClick={() => captureError(new Error('Hook error'))}>Trigger Error</button>
      <button onClick={resetError}>Reset Error</button>
    </div>
  );
};

describe('AutosaveErrorBoundary - Basic functionality', () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  test('should render children when no error occurs', () => {
    render(
      <AutosaveErrorBoundary>
        <div>Test content</div>
      </AutosaveErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  test('should render error UI when error is caught', () => {
    render(
      <AutosaveErrorBoundary>
        <ThrowError shouldThrow={true} />
      </AutosaveErrorBoundary>
    );

    expect(screen.getByText('Autosave Temporarily Unavailable')).toBeInTheDocument();
    expect(screen.getByText(/Settings will not be automatically saved/)).toBeInTheDocument();
  });
});

describe('useAutosaveErrorBoundary hook', () => {
  test('should manage error state correctly', () => {
    render(<HookTestComponent />);

    expect(screen.getByTestId('error-status')).toHaveTextContent('No Error');
    expect(screen.getByTestId('error-message')).toHaveTextContent('No Message');

    // Trigger error
    fireEvent.click(screen.getByText('Trigger Error'));

    expect(screen.getByTestId('error-status')).toHaveTextContent('Has Error');
    expect(screen.getByTestId('error-message')).toHaveTextContent('Hook error');

    // Reset error
    fireEvent.click(screen.getByText('Reset Error'));

    expect(screen.getByTestId('error-status')).toHaveTextContent('No Error');
    expect(screen.getByTestId('error-message')).toHaveTextContent('No Message');
  });
});