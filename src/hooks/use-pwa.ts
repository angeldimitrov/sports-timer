/**
 * usePWA React Hook
 * 
 * React hook for managing Progressive Web App features including installation prompts,
 * update notifications, and PWA state management for the boxing timer.
 * 
 * Features:
 * - PWA installation prompt handling
 * - Service worker update management  
 * - Offline status detection
 * - App update notifications
 * - Install analytics and user experience optimization
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createModuleLogger } from '../lib/logger';

const log = createModuleLogger('usePWA');

// PWA installation event types
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface PWAState {
  /** Whether app can be installed */
  canInstall: boolean;
  /** Whether app is currently installed */
  isInstalled: boolean;
  /** Whether app is running in standalone mode */
  isStandalone: boolean;
  /** Whether device is currently offline */
  isOffline: boolean;
  /** Whether a service worker update is available */
  hasUpdate: boolean;
  /** Current installation platform */
  platform: string | null;
}

export interface UsePWAOptions {
  /** Auto-show install prompt after delay (ms) */
  autoPromptDelay?: number;
  /** Show install prompt after certain number of sessions */
  promptAfterSessions?: number;
  /** Callback when installation is successful */
  onInstallSuccess?: () => void;
  /** Callback when installation is dismissed */
  onInstallDismissed?: () => void;
  /** Callback when app update is available */
  onUpdateAvailable?: () => void;
  /** Enable installation analytics */
  enableAnalytics?: boolean;
}

export interface UsePWAReturn {
  /** Current PWA state */
  state: PWAState;
  /** Show installation prompt manually */
  showInstallPrompt: () => Promise<boolean>;
  /** Install app update */
  installUpdate: () => Promise<void>;
  /** Dismiss install prompt */
  dismissInstallPrompt: () => void;
  /** Get install prompt element for custom UI */
  getInstallPromptElement: () => HTMLElement | null;
}

/**
 * React hook for PWA management
 * 
 * Handles Progressive Web App installation, updates, and state management.
 * Provides a comprehensive interface for PWA features with user experience optimization.
 * 
 * @param options Configuration options for PWA behavior
 * @returns PWA control interface and state
 */
export function usePWA(options: UsePWAOptions = {}): UsePWAReturn {
  const {
    onInstallSuccess,
    onInstallDismissed,
    onUpdateAvailable,
    enableAnalytics = true
  } = options;

  // State management
  const [state, setState] = useState<PWAState>({
    canInstall: false,
    isInstalled: false,
    isStandalone: false,
    isOffline: false,
    hasUpdate: false,
    platform: null
  });

  // Refs for stable references
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const serviceWorkerRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);

  /**
   * Check if app is running in standalone mode
   */
  const checkStandaloneMode = useCallback(() => {
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true) ||
      document.referrer.includes('android-app://');
    
    return isStandalone;
  }, []);

  /**
   * Check offline status
   */
  const checkOfflineStatus = useCallback(() => {
    return !navigator.onLine;
  }, []);

  /**
   * Get session count for install prompt timing
   */
  const getSessionCount = useCallback(() => {
    const sessions = localStorage.getItem('pwa-sessions');
    return sessions ? parseInt(sessions, 10) : 0;
  }, []);

  /**
   * Increment session count
   */
  const incrementSessionCount = useCallback(() => {
    const sessions = getSessionCount() + 1;
    localStorage.setItem('pwa-sessions', sessions.toString());
    return sessions;
  }, [getSessionCount]);


  /**
   * Show installation prompt
   */
  const showInstallPrompt = useCallback(async (): Promise<boolean> => {
    if (!deferredPromptRef.current) {
      log.warn('No install prompt available');
      return false;
    }

    try {
      // Show the prompt
      await deferredPromptRef.current.prompt();
      
      // Wait for user choice
      const choiceResult = await deferredPromptRef.current.userChoice;
      
      if (enableAnalytics) {
        log.info('Install prompt result:', choiceResult.outcome);
      }

      if (choiceResult.outcome === 'accepted') {
        log.info('User accepted the install prompt');
        
        setState(prev => ({
          ...prev,
          canInstall: false,
          isInstalled: true
        }));
        
        if (onInstallSuccess) {
          onInstallSuccess();
        }
        
        // Clear session tracking
        localStorage.removeItem('pwa-sessions');
        localStorage.removeItem('pwa-dismissed');
        
        return true;
      } else {
        log.info('User dismissed the install prompt');
        
        // Mark as dismissed
        localStorage.setItem('pwa-dismissed', new Date().toISOString());
        
        if (onInstallDismissed) {
          onInstallDismissed();
        }
        
        return false;
      }
    } catch (error) {
      log.error('Install prompt failed:', error);
      return false;
    } finally {
      // Clear the prompt
      deferredPromptRef.current = null;
      setState(prev => ({ ...prev, canInstall: false }));
    }
  }, [enableAnalytics, onInstallSuccess, onInstallDismissed]);

  /**
   * Dismiss install prompt
   */
  const dismissInstallPrompt = useCallback(() => {
    localStorage.setItem('pwa-dismissed', new Date().toISOString());
    setState(prev => ({ ...prev, canInstall: false }));
    deferredPromptRef.current = null;
    
    if (onInstallDismissed) {
      onInstallDismissed();
    }
  }, [onInstallDismissed]);

  /**
   * Install app update
   */
  const installUpdate = useCallback(async (): Promise<void> => {
    if (!serviceWorkerRegistrationRef.current || !serviceWorkerRegistrationRef.current.waiting) {
      log.warn('No update available');
      return;
    }

    try {
      // Tell the waiting service worker to skip waiting and become active
      serviceWorkerRegistrationRef.current.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Reload the page to activate the new service worker
      window.location.reload();
    } catch (error) {
      log.error('Update installation failed:', error);
    }
  }, []);

  /**
   * Get install prompt element for custom UI
   */
  const getInstallPromptElement = useCallback((): HTMLElement | null => {
    return document.getElementById('pwa-install-prompt');
  }, []);

  /**
   * Handle beforeinstallprompt event
   */
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      log.debug('beforeinstallprompt event triggered');
      
      // Prevent the default mini-infobar from appearing
      e.preventDefault();
      
      // Store the event for later use
      deferredPromptRef.current = e;
      
      // Update state
      setState(prev => ({
        ...prev,
        canInstall: true,
        platform: e.platforms?.[0] || 'unknown'
      }));

      // Auto-prompt not allowed - browser requires user gesture for install prompts
      // The install prompt can only be shown when triggered by user interaction
      // Store the event for manual prompt triggering via UI buttons
    };

    // Add event listener
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    };
  }, []); // No dependencies needed - just setting up event listener

  /**
   * Handle app installed event
   */
  useEffect(() => {
    const handleAppInstalled = () => {
      log.info('App was installed');
      
      setState(prev => ({
        ...prev,
        isInstalled: true,
        canInstall: false
      }));
      
      if (onInstallSuccess) {
        onInstallSuccess();
      }
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [onInstallSuccess]);

  /**
   * Handle online/offline status
   */
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOffline: false }));
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOffline: true }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * Handle service worker updates
   */
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        serviceWorkerRegistrationRef.current = registration;

        // Check for updates
        const handleUpdateFound = () => {
          const newWorker = registration.installing;
          if (newWorker) {
            const handleStateChange = () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                log.info('New service worker installed, update available');
                
                setState(prev => ({ ...prev, hasUpdate: true }));
                
                if (onUpdateAvailable) {
                  onUpdateAvailable();
                }
              }
            };

            newWorker.addEventListener('statechange', handleStateChange);
          }
        };

        registration.addEventListener('updatefound', handleUpdateFound);

        // Check for waiting service worker
        if (registration.waiting) {
          setState(prev => ({ ...prev, hasUpdate: true }));
          
          if (onUpdateAvailable) {
            onUpdateAvailable();
          }
        }

        return () => {
          registration.removeEventListener('updatefound', handleUpdateFound);
        };
      });
    }
  }, [onUpdateAvailable]);

  /**
   * Initialize PWA state - run only once on mount
   */
  useEffect(() => {
    const isInstalled = checkStandaloneMode();
    const isOffline = checkOfflineStatus();

    setState(prev => ({
      ...prev,
      isInstalled,
      isStandalone: isInstalled,
      isOffline
    }));

    // Increment session count for install prompt timing (only for main instance)
    if (!isInstalled && options.onInstallSuccess) {
      incrementSessionCount();
    }

    // Analytics (only log for main instance to avoid spam)
    if (enableAnalytics && onInstallSuccess) {
      log.debug('PWA state initialized:', {
        isInstalled,
        isStandalone: isInstalled,
        isOffline,
        sessionCount: getSessionCount()
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - dependencies cause infinite loops

  return {
    state,
    showInstallPrompt,
    installUpdate,
    dismissInstallPrompt,
    getInstallPromptElement
  };
}

/**
 * Hook variant for simple install prompt management
 */
export function useInstallPrompt(): {
  canInstall: boolean;
  showPrompt: () => Promise<boolean>;
  dismissPrompt: () => void;
} {
  const { state, showInstallPrompt, dismissInstallPrompt } = usePWA();
  
  return {
    canInstall: state.canInstall,
    showPrompt: showInstallPrompt,
    dismissPrompt: dismissInstallPrompt
  };
}

/**
 * Get PWA capabilities for the current environment
 */
export function getPWACapabilities(): {
  supportsServiceWorker: boolean;
  supportsInstallPrompt: boolean;
  supportsStandalone: boolean;
  supportsManifest: boolean;
} {
  if (typeof window === 'undefined') {
    return {
      supportsServiceWorker: false,
      supportsInstallPrompt: false,
      supportsStandalone: false,
      supportsManifest: false
    };
  }

  return {
    supportsServiceWorker: 'serviceWorker' in navigator,
    supportsInstallPrompt: 'BeforeInstallPromptEvent' in window,
    supportsStandalone: 'standalone' in window.navigator || window.matchMedia('(display-mode: standalone)').matches,
    supportsManifest: 'manifest' in document.head
  };
}