/**
 * Premium PWA Status Indicator Component
 * 
 * Provides sophisticated visual feedback for PWA installation and update status.
 * Features premium animations, haptic feedback, and accessibility support.
 * 
 * Premium Features:
 * - Real-time installation status with smooth state transitions
 * - Premium visual indicators with gradient effects and animations
 * - Haptic feedback for status changes (on supported devices)
 * - Accessibility-first design with proper ARIA labels
 * - Auto-hiding behavior with smart timing
 * - Integration with service worker update notifications
 * - Professional error states with retry mechanisms
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Download, AlertCircle, RefreshCw, Wifi, WifiOff, Smartphone } from 'lucide-react';

interface PWAStatusProps {
  /** Auto-hide delay in milliseconds */
  autoHideDelay?: number;
  /** Enable haptic feedback */
  enableHaptics?: boolean;
  /** Show connection status */
  showConnectionStatus?: boolean;
  /** Custom position */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

type PWAStatusType = 
  | 'idle'
  | 'installing' 
  | 'installed'
  | 'update-available'
  | 'updating'
  | 'error'
  | 'offline'
  | 'online';

interface PWAStatusState {
  type: PWAStatusType;
  message: string;
  details?: string;
  action?: {
    label: string;
    handler: () => void;
  };
}

/**
 * Premium PWA Status Indicator
 * 
 * Displays real-time PWA installation and connectivity status with sophisticated animations
 */
export function PWAStatus({
  autoHideDelay = 4000,
  enableHaptics = true,
  showConnectionStatus = true,
  position = 'top-right'
}: PWAStatusProps) {
  const [statusState, setStatusState] = useState<PWAStatusState>({
    type: 'idle',
    message: ''
  });
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  /**
   * Trigger haptic feedback with different intensities
   */
  const triggerHaptic = useCallback((type: 'success' | 'error' | 'light' | 'medium' = 'light') => {
    if (!enableHaptics || !navigator.vibrate) return;
    
    const patterns = {
      success: [100, 50, 100, 50, 200],
      error: [200, 100, 200, 100, 200],
      light: [50],
      medium: [100]
    };
    
    navigator.vibrate(patterns[type]);
  }, [enableHaptics]);

  /**
   * Hide status with animation
   */
  const hideStatus = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsAnimating(false);
    }, 200);
  }, []);

  /**
   * Show status with premium animation
   */
  const showStatus = useCallback((newState: PWAStatusState) => {
    setIsAnimating(true);
    setStatusState(newState);
    setIsVisible(true);
    
    // Trigger appropriate haptic feedback
    switch (newState.type) {
      case 'installed':
        triggerHaptic('success');
        break;
      case 'error':
        triggerHaptic('error');
        break;
      case 'update-available':
        triggerHaptic('medium');
        break;
      default:
        triggerHaptic('light');
    }
    
    setTimeout(() => setIsAnimating(false), 300);
    
    // Auto-hide for certain status types
    if (['installed', 'online', 'offline'].includes(newState.type)) {
      setTimeout(() => {
        hideStatus();
      }, autoHideDelay);
    }
  }, [autoHideDelay, triggerHaptic, hideStatus]);

  /**
   * Handle PWA installation events
   */
  useEffect(() => {
    if (!isMounted) return;

    const handlePWAInstalled = () => {
      showStatus({
        type: 'installed',
        message: 'App Installed!',
        details: 'Boxing Timer is now available on your home screen'
      });
    };

    const handlePWAError = (event: CustomEvent) => {
      showStatus({
        type: 'error',
        message: 'Installation Failed',
        details: event.detail?.error?.message || 'Please try again',
        action: {
          label: 'Retry',
          handler: () => {
            window.location.reload();
          }
        }
      });
    };

    const handleUpdateAvailable = (event: CustomEvent) => {
      showStatus({
        type: 'update-available',
        message: 'Update Available',
        details: 'A new version is ready to install',
        action: {
          label: 'Update',
          handler: () => {
            setStatusState(prev => ({ ...prev, type: 'updating', message: 'Updating...' }));
            
            // Tell service worker to skip waiting
            if (event.detail?.registration?.waiting) {
              event.detail.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
          }
        }
      });
    };

    // Listen for PWA events
    window.addEventListener('pwa-installed', handlePWAInstalled as EventListener);
    window.addEventListener('pwa-sw-error', handlePWAError as EventListener);
    window.addEventListener('pwa-update-available', handleUpdateAvailable as EventListener);

    return () => {
      window.removeEventListener('pwa-installed', handlePWAInstalled as EventListener);
      window.removeEventListener('pwa-sw-error', handlePWAError as EventListener);
      window.removeEventListener('pwa-update-available', handleUpdateAvailable as EventListener);
    };
  }, [isMounted, showStatus]);

  /**
   * Handle online/offline status
   */
  useEffect(() => {
    if (!isMounted || !showConnectionStatus) return;

    const handleOnline = () => {
      showStatus({
        type: 'online',
        message: 'Back Online',
        details: 'Internet connection restored'
      });
    };

    const handleOffline = () => {
      showStatus({
        type: 'offline',
        message: 'You\'re Offline',
        details: 'Timer still works offline'
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isMounted, showConnectionStatus, showStatus]);

  /**
   * Get status configuration
   */
  const getStatusConfig = (type: PWAStatusType) => {
    const configs = {
      idle: {
        icon: Smartphone,
        color: 'text-slate-400',
        bgColor: 'bg-slate-600/20',
        borderColor: 'border-slate-500/30'
      },
      installing: {
        icon: Download,
        color: 'text-blue-400',
        bgColor: 'bg-blue-600/20',
        borderColor: 'border-blue-500/30'
      },
      installed: {
        icon: CheckCircle,
        color: 'text-green-400',
        bgColor: 'bg-green-600/20',
        borderColor: 'border-green-500/30'
      },
      'update-available': {
        icon: RefreshCw,
        color: 'text-amber-400',
        bgColor: 'bg-amber-600/20',
        borderColor: 'border-amber-500/30'
      },
      updating: {
        icon: RefreshCw,
        color: 'text-blue-400',
        bgColor: 'bg-blue-600/20',
        borderColor: 'border-blue-500/30'
      },
      error: {
        icon: AlertCircle,
        color: 'text-red-400',
        bgColor: 'bg-red-600/20',
        borderColor: 'border-red-500/30'
      },
      offline: {
        icon: WifiOff,
        color: 'text-orange-400',
        bgColor: 'bg-orange-600/20',
        borderColor: 'border-orange-500/30'
      },
      online: {
        icon: Wifi,
        color: 'text-green-400',
        bgColor: 'bg-green-600/20',
        borderColor: 'border-green-500/30'
      }
    };

    return configs[type];
  };

  // Don't render during SSR
  if (!isMounted || !isVisible) return null;

  const config = getStatusConfig(statusState.type);
  const Icon = config.icon;

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  return (
    <div
      className={`fixed ${positionClasses[position]} z-50 transition-all duration-300 ${
        isAnimating ? 'animate-slide-in-smooth' : ''
      }`}
      role="status"
      aria-live="polite"
      aria-label={`PWA Status: ${statusState.message}`}
    >
      <div className={`
        glass-premium border ${config.borderColor} rounded-lg shadow-xl p-4 min-w-[280px] max-w-[320px]
        transition-all duration-300 hover:shadow-2xl
        ${config.bgColor}
      `}>
        {/* Header with icon and message */}
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${config.bgColor} ${config.borderColor} border`}>
            <Icon 
              className={`w-5 h-5 ${config.color} ${
                statusState.type === 'updating' ? 'animate-spin' : ''
              } ${
                statusState.type === 'installed' ? 'animate-premium-bounce' : ''
              }`} 
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white mb-1">
              {statusState.message}
            </h3>
            
            {statusState.details && (
              <p className="text-xs text-slate-300 leading-relaxed">
                {statusState.details}
              </p>
            )}
            
            {/* Action button */}
            {statusState.action && (
              <button
                onClick={statusState.action.handler}
                className="mt-3 w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500/50"
              >
                {statusState.action.label}
              </button>
            )}
          </div>
          
          {/* Close button */}
          <button
            onClick={hideStatus}
            className="p-1 rounded-full hover:bg-slate-700/50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-500/50"
            aria-label="Close status notification"
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Premium shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Compact PWA Status Badge
 * 
 * Minimal status indicator for use in navigation or header areas
 */
export function PWAStatusBadge() {
  const [status, setStatus] = useState<PWAStatusType>('idle');
  const [isMounted, setIsMounted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const handleInstalled = () => {
      setStatus('installed');
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 2000);
    };

    const handleUpdateAvailable = () => {
      setStatus('update-available');
      setIsAnimating(true);
    };

    const handleError = () => {
      setStatus('error');
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 3000);
    };

    window.addEventListener('pwa-installed', handleInstalled);
    window.addEventListener('pwa-update-available', handleUpdateAvailable);
    window.addEventListener('pwa-sw-error', handleError);

    return () => {
      window.removeEventListener('pwa-installed', handleInstalled);
      window.removeEventListener('pwa-update-available', handleUpdateAvailable);
      window.removeEventListener('pwa-sw-error', handleError);
    };
  }, [isMounted]);

  if (!isMounted || status === 'idle') return null;

  const getStatusColor = (type: PWAStatusType) => {
    const colors = {
      installed: 'bg-green-500',
      'update-available': 'bg-amber-500',
      error: 'bg-red-500',
      idle: 'bg-slate-500',
      installing: 'bg-blue-500',
      updating: 'bg-blue-500',
      offline: 'bg-orange-500',
      online: 'bg-green-500'
    };
    return colors[type];
  };

  return (
    <div
      className={`w-3 h-3 rounded-full ${getStatusColor(status)} transition-all duration-300 ${
        isAnimating ? 'animate-shadow-pulse' : ''
      }`}
      title={`PWA Status: ${status.replace('-', ' ')}`}
      role="status"
      aria-label={`PWA Status: ${status.replace('-', ' ')}`}
    />
  );
}