'use client';

import { useEffect, useState } from 'react';
import { getPublicPath } from '@/lib/get-base-path';

/**
 * PWA Manager Component
 * 
 * Handles Progressive Web App functionality including:
 * - Install prompt management
 * - Service worker updates
 * - Offline status monitoring
 * - Mobile-specific PWA optimizations
 * - Base path-aware PWA functionality
 * 
 * This component ensures PWA features work correctly on GitHub Pages
 * with the dynamic base path system.
 */

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PWAManager() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Check if app is already installed
    const checkInstallStatus = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = 'standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true;
      setIsInstalled(isStandalone || isIOSStandalone);
    };

    checkInstallStatus();

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('[PWA] Before install prompt triggered');
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // Listen for app installation
    const handleAppInstalled = () => {
      console.log('[PWA] App was installed');
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    // Listen for online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Set initial online status
    setIsOnline(navigator.onLine);

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Service Worker registration and management
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(getPublicPath('/sw.js'))
        .then(registration => {
          console.log('[PWA] Service Worker registered:', registration.scope);
          setSwRegistration(registration);

          // Listen for service worker updates
          registration.addEventListener('updatefound', () => {
            console.log('[PWA] New service worker found, installing...');
            const newWorker = registration.installing;
            
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[PWA] New service worker installed, will activate on next page load');
                  // Optionally show update available notification
                  showUpdateAvailable();
                }
              });
            }
          });
        })
        .catch(error => {
          console.error('[PWA] Service Worker registration failed:', error);
        });

      // Listen for service worker messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('[PWA] Message from service worker:', event.data);
        
        if (event.data && event.data.type === 'SYNC_SETTINGS') {
          console.log('[PWA] Settings sync message received');
        }
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      // Show the install prompt
      await deferredPrompt.prompt();
      
      // Wait for user response
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log(`[PWA] User ${outcome} the install prompt`);
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      
      setDeferredPrompt(null);
      setIsInstallable(false);
    } catch (error) {
      console.error('[PWA] Install prompt failed:', error);
    }
  };

  const showUpdateAvailable = () => {
    // Show a subtle notification that an update is available
    const notification = document.createElement('div');
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 1rem;
        right: 1rem;
        background: #1e293b;
        color: white;
        padding: 1rem;
        border-radius: 0.5rem;
        border-left: 4px solid #dc2626;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        max-width: 300px;
        font-size: 0.875rem;
      ">
        <div style="font-weight: 600; margin-bottom: 0.5rem;">Update Available</div>
        <div style="margin-bottom: 1rem; color: #cbd5e1;">A new version of Boxing Timer is available.</div>
        <button onclick="location.reload()" style="
          background: #dc2626;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 0.25rem;
          cursor: pointer;
          font-size: 0.875rem;
          margin-right: 0.5rem;
        ">Update Now</button>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: transparent;
          color: #cbd5e1;
          border: 1px solid #475569;
          padding: 0.5rem 1rem;
          border-radius: 0.25rem;
          cursor: pointer;
          font-size: 0.875rem;
        ">Later</button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 10000);
  };

  // iOS Safari install instructions
  const showIOSInstallInstructions = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    if (isIOS && isSafari && !isInstalled) {
      return (
        <div className="ios-install-prompt bg-slate-800 p-4 rounded-lg border-l-4 border-red-600 mb-4">
          <div className="text-sm">
            <div className="font-semibold text-white mb-2">Add to Home Screen</div>
            <div className="text-slate-300 mb-3">
              Install Boxing Timer for the best experience:
            </div>
            <ol className="text-slate-300 text-sm space-y-1 ml-4">
              <li>1. Tap the Share button</li>
              <li>2. Select &quot;Add to Home Screen&quot;</li>
              <li>3. Tap &quot;Add&quot; to install</li>
            </ol>
          </div>
        </div>
      );
    }
    
    return null;
  };

  // Don't render anything if already installed
  if (isInstalled) {
    return null;
  }

  return (
    <div className="pwa-manager">
      {/* Offline status indicator */}
      {!isOnline && (
        <div className="offline-banner bg-slate-800 text-white p-2 text-center text-sm border-b border-slate-700">
          <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
          You&apos;re offline - Timer will continue to work
        </div>
      )}

      {/* iOS install instructions */}
      {showIOSInstallInstructions()}

      {/* Install prompt for other browsers */}
      {isInstallable && (
        <div className="install-prompt bg-slate-800 p-4 rounded-lg border-l-4 border-red-600 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-white mb-1">Install Boxing Timer</div>
              <div className="text-slate-300 text-sm">
                Add to your home screen for quick access and offline use
              </div>
            </div>
            <button
              onClick={handleInstallClick}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex-shrink-0 ml-4"
            >
              Install
            </button>
          </div>
        </div>
      )}
    </div>
  );
}