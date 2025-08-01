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

// BeforeInstallPromptEvent interface removed - install prompts disabled for cleaner UX

export function PWAManager() {
  // Disabled install prompts for cleaner UX - only red download icon is used now
  // const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  // const [isInstallable, setIsInstallable] = useState(false); // Disabled for cleaner UX
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

    // beforeinstallprompt event handling disabled for cleaner UX - install via red download icon only

    // Listen for app installation
    const handleAppInstalled = () => {
      console.log('[PWA] App was installed');
      setIsInstalled(true);
      // setIsInstallable(false); // Disabled for cleaner UX
      // setDeferredPrompt(null); // Disabled for cleaner UX
    };

    // Listen for online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Set initial online status
    setIsOnline(navigator.onLine);

    // Add event listeners (beforeinstallprompt disabled for cleaner UX)
    // window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt); // Disabled
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Service Worker registration and management
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(getPublicPath('/sw.js'))
        .then(registration => {
          console.log('[PWA] Service Worker registered:', registration.scope);
          // Service worker registered successfully

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
      // window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt); // Disabled
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // handleInstallClick function removed - install now handled only by red download icon

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

  // iOS Safari install instructions removed - install now handled only by red download icon

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

      {/* All install prompts disabled - using only the red download icon for cleaner UX */}
      {/* showIOSInstallInstructions() - disabled */}
      {/* Install prompt for other browsers - disabled */}
    </div>
  );
}