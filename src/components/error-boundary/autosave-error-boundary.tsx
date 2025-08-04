'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';

interface AutosaveErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface AutosaveErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

/**
 * Error Boundary specifically for autosave functionality
 * 
 * Provides graceful degradation when autosave features fail,
 * allowing the main application to continue functioning while
 * providing user feedback about save issues.
 */
export class AutosaveErrorBoundary extends Component<
  AutosaveErrorBoundaryProps,
  AutosaveErrorBoundaryState
> {
  private readonly maxRetries = 2;

  constructor(props: AutosaveErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<AutosaveErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details for debugging
    console.error('Autosave Error Boundary caught an error:', error);
    console.error('Error info:', errorInfo);
    
    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      retryCount: 0
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="text-amber-300 font-medium text-sm">
                Autosave Temporarily Unavailable
              </h3>
              <p className="text-amber-400/80 text-xs mt-1">
                Settings will not be automatically saved. You can continue using the app, 
                but your changes may not be persisted.
              </p>
              
              {this.state.retryCount < this.maxRetries && (
                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={this.handleRetry}
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Retry ({this.maxRetries - this.state.retryCount} left)
                  </Button>
                </div>
              )}
              
              {this.state.retryCount >= this.maxRetries && (
                <div className="mt-3">
                  <p className="text-amber-400/60 text-xs">
                    Please refresh the page to restore autosave functionality.
                  </p>
                  <Button
                    onClick={() => window.location.reload()}
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs mt-2 bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Refresh Page
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based wrapper for easier use in functional components
 */
export function useAutosaveErrorBoundary() {
  const [hasError, setHasError] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setHasError(false);
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    console.error('Autosave error captured:', error);
    setHasError(true);
    setError(error);
  }, []);

  return {
    hasError,
    error,
    resetError,
    captureError
  };
}