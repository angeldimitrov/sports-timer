'use client';

/**
 * Premium Toast Notification Component
 * 
 * Sophisticated toast notification system with glass morphism design and smooth animations.
 * Features multiple variants (success, error, undo) with auto-dismiss and undo functionality.
 * 
 * Design Philosophy:
 * - Glass morphism with backdrop blur and subtle borders
 * - Smooth animations using framer-motion
 * - Auto-dismiss with customizable duration
 * - Undo variant with action button
 * - Premium visual hierarchy and typography
 * - Accessible with proper ARIA attributes
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  AlertCircle, 
  Undo2,
  X,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export interface ToastConfig {
  /** Unique identifier for the toast */
  id: string;
  /** Toast variant determining visual style */
  variant: 'success' | 'error' | 'undo' | 'loading';
  /** Main toast message */
  title: string;
  /** Optional description text */
  description?: string;
  /** Auto-dismiss duration in milliseconds (0 = no auto-dismiss) */
  duration?: number;
  /** Undo action callback (only for undo variant) */
  onUndo?: () => void;
  /** Toast dismiss callback */
  onDismiss?: () => void;
}

export interface ToastProps extends ToastConfig {
  /** Whether the toast is visible */
  isVisible: boolean;
  /** Manual dismiss handler */
  onClose: () => void;
}

/**
 * Individual Toast Component
 * 
 * Renders a single toast notification with glass morphism design
 * and smooth entrance/exit animations
 */
export function Toast({
  id,
  variant,
  title,
  description,
  duration = 4000,
  onUndo,
  onDismiss,
  isVisible,
  onClose
}: ToastProps) {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-dismiss functionality
  useEffect(() => {
    if (!isVisible || duration === 0 || isPaused) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 100) {
          onClose();
          return 0;
        }
        return prev - 100;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isVisible, duration, isPaused, onClose]);

  // Handle undo action
  const handleUndo = useCallback(() => {
    onUndo?.();
    onClose();
  }, [onUndo, onClose]);

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    onDismiss?.();
    onClose();
  }, [onDismiss, onClose]);

  // Get variant-specific styles and icons
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          containerClass: 'border-green-400/30 bg-green-500/10 backdrop-blur-xl',
          iconClass: 'text-green-400',
          titleClass: 'text-green-100',
          progressClass: 'bg-green-400',
          icon: CheckCircle
        };
      case 'error':
        return {
          containerClass: 'border-red-400/30 bg-red-500/10 backdrop-blur-xl',
          iconClass: 'text-red-400',
          titleClass: 'text-red-100',
          progressClass: 'bg-red-400',
          icon: AlertCircle
        };
      case 'undo':
        return {
          containerClass: 'border-blue-400/30 bg-blue-500/10 backdrop-blur-xl',
          iconClass: 'text-blue-400',
          titleClass: 'text-blue-100',
          progressClass: 'bg-blue-400',
          icon: Undo2
        };
      case 'loading':
        return {
          containerClass: 'border-slate-400/30 bg-slate-500/10 backdrop-blur-xl',
          iconClass: 'text-slate-400',
          titleClass: 'text-slate-100',
          progressClass: 'bg-slate-400',
          icon: Loader2
        };
      default:
        return {
          containerClass: 'border-slate-400/30 bg-slate-500/10 backdrop-blur-xl',
          iconClass: 'text-slate-400',
          titleClass: 'text-slate-100',
          progressClass: 'bg-slate-400',
          icon: CheckCircle
        };
    }
  };

  const styles = getVariantStyles();
  const Icon = styles.icon;

  return (
    <motion.div
      id={id}
      role="alert"
      aria-live="polite"
      className={cn(
        'relative flex items-start gap-4 p-4 rounded-2xl border shadow-2xl',
        'min-w-[320px] max-w-[480px]',
        styles.containerClass
      )}
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
        mass: 0.8
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      layout
    >
      {/* Progress bar for auto-dismiss */}
      {duration > 0 && variant !== 'loading' && (
        <motion.div
          className="absolute bottom-0 left-0 h-1 rounded-b-2xl opacity-60"
          style={{
            width: `${(timeRemaining / duration) * 100}%`,
            backgroundColor: styles.progressClass.replace('bg-', '')
          }}
          initial={{ width: '100%' }}
          animate={{ width: `${(timeRemaining / duration) * 100}%` }}
          transition={{ duration: 0.1, ease: 'linear' }}
        />
      )}

      {/* Icon */}
      <div className={cn('flex-shrink-0 mt-0.5', styles.iconClass)}>
        <Icon 
          className={cn(
            'w-5 h-5',
            variant === 'loading' && 'animate-spin'
          )} 
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className={cn('font-semibold text-sm', styles.titleClass)}>
          {title}
        </div>
        {description && (
          <div className="text-slate-300 text-sm mt-1 leading-relaxed">
            {description}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {variant === 'undo' && onUndo && (
          <Button
            onClick={handleUndo}
            size="sm"
            className={cn(
              'h-8 px-3 text-xs font-medium',
              'bg-blue-500/20 hover:bg-blue-500/30',
              'border border-blue-400/30 hover:border-blue-400/50',
              'text-blue-200 hover:text-blue-100',
              'transition-all duration-200'
            )}
          >
            Undo
          </Button>
        )}
        
        <Button
          onClick={handleDismiss}
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 w-8 p-0',
            'text-slate-400 hover:text-slate-200',
            'hover:bg-slate-500/20',
            'transition-colors duration-200'
          )}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}

/**
 * Toast Container Context and Provider
 */
interface ToastContextType {
  showToast: (config: Omit<ToastConfig, 'id'>) => string;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = React.createContext<ToastContextType | null>(null);

/**
 * Toast Provider Component
 * 
 * Manages toast state and provides context for showing/dismissing toasts
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<(ToastConfig & { isVisible: boolean })[]>([]);

  const showToast = useCallback((config: Omit<ToastConfig, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const toast = {
      ...config,
      id,
      isVisible: true
    };

    setToasts(prev => [...prev, toast]);
    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => 
      prev.map(toast => 
        toast.id === id 
          ? { ...toast, isVisible: false }
          : toast
      )
    );

    // Remove from array after animation completes
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 300);
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts(prev => 
      prev.map(toast => ({ ...toast, isVisible: false }))
    );

    setTimeout(() => {
      setToasts([]);
    }, 300);
  }, []);

  const contextValue: ToastContextType = {
    showToast,
    dismissToast,
    clearAllToasts
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-50 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              className="pointer-events-auto mb-3"
              layout
            >
              <Toast
                {...toast}
                onClose={() => dismissToast(toast.id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Hook to access toast functionality
 */
export function useToast() {
  const context = React.useContext(ToastContext);
  
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
}

/**
 * Convenience hook for common toast patterns
 */
export function useToastHelpers() {
  const { showToast } = useToast();

  const showSuccess = useCallback((title: string, description?: string) => {
    return showToast({
      variant: 'success',
      title,
      description,
      duration: 3000
    });
  }, [showToast]);

  const showError = useCallback((title: string, description?: string) => {
    return showToast({
      variant: 'error',
      title,
      description,
      duration: 5000
    });
  }, [showToast]);

  const showUndo = useCallback((
    title: string, 
    onUndo: () => void, 
    description?: string
  ) => {
    return showToast({
      variant: 'undo',
      title,
      description,
      duration: 3000,
      onUndo
    });
  }, [showToast]);

  const showLoading = useCallback((title: string, description?: string) => {
    return showToast({
      variant: 'loading',
      title,
      description,
      duration: 0 // No auto-dismiss for loading
    });
  }, [showToast]);

  return {
    showSuccess,
    showError,
    showUndo,
    showLoading
  };
}