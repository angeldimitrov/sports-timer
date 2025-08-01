/**
 * Offline Indicator Component
 * 
 * Displays connection status and offline capabilities for the Boxing Timer PWA.
 * Provides user feedback about network connectivity and available features.
 * 
 * Features:
 * - Real-time connection status
 * - Offline capabilities indicator
 * - Smooth transitions between states
 * - Non-intrusive notification style
 * - Mobile-optimized design
 */

'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Wifi, 
  WifiOff, 
  CheckCircle, 
  X,
  Timer,
  Volume2,
  Smartphone
} from 'lucide-react';

export interface OfflineIndicatorProps {
  /** Show detailed offline capabilities */
  showCapabilities?: boolean;
  /** Auto-hide delay when coming back online (ms) */
  autoHideDelay?: number;
}

/**
 * Offline Indicator
 * 
 * Shows the current connection status and informs users about offline capabilities.
 * Provides reassurance that core timer functionality works without internet.
 */
export function OfflineIndicator({
  showCapabilities = true,
  autoHideDelay = 3000
}: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [showDetail, setShowDetail] = useState(false);
  const [justCameOnline, setJustCameOnline] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  /**
   * Handle hydration and mounting
   */
  useEffect(() => {
    setIsMounted(true);
  }, []);

  /**
   * Handle connection status changes
   */
  useEffect(() => {
    if (!isMounted) return;

    const updateOnlineStatus = () => {
      const online = navigator.onLine;
      const wasOffline = !isOnline;
      
      setIsOnline(online);
      
      if (online && wasOffline) {
        // Just came back online
        setJustCameOnline(true);
        setShowDetail(true);
        
        // Auto-hide success message
        setTimeout(() => {
          setShowDetail(false);
          setJustCameOnline(false);
        }, autoHideDelay);
      } else if (!online) {
        // Went offline
        setShowDetail(true);
        setJustCameOnline(false);
      }
    };

    // Initial status
    updateOnlineStatus();

    // Listen for connection changes
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, [isMounted, isOnline, autoHideDelay]);

  /**
   * Dismiss the detail view
   */
  const handleDismiss = () => {
    setShowDetail(false);
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!isMounted) return null;

  return (
    <>
      {/* Status badge */}
      <Badge 
        variant={isOnline ? 'default' : 'secondary'}
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-30 transition-all duration-300 ${
          isOnline 
            ? 'bg-green-600/90 text-white backdrop-blur-sm' 
            : 'bg-orange-600/90 text-white backdrop-blur-sm'
        } ${justCameOnline ? 'animate-pulse' : ''}`}
      >
        {isOnline ? (
          <>
            <Wifi className="w-3 h-3 mr-1" />
            Online
          </>
        ) : (
          <>
            <WifiOff className="w-3 h-3 mr-1" />
            Offline
          </>
        )}
      </Badge>

      {/* Detailed view */}
      {showDetail && (
        <div className="fixed inset-x-4 top-16 z-40 animate-in slide-in-from-top duration-300 md:left-auto md:right-8 md:max-w-md">
          <Card className="bg-slate-900/95 backdrop-blur-lg border-slate-800 shadow-2xl">
            <CardContent className="p-4">
              {/* Dismiss button */}
              <button
                onClick={handleDismiss}
                className="absolute top-2 right-2 p-1 rounded-full hover:bg-slate-800 transition-colors"
                aria-label="Dismiss offline notification"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>

              <div className="flex items-start gap-4">
                {/* Status icon */}
                <div className={`p-3 rounded-lg ${
                  isOnline 
                    ? 'bg-green-600/20' 
                    : 'bg-orange-600/20'
                }`}>
                  {isOnline ? (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  ) : (
                    <WifiOff className="w-6 h-6 text-orange-500" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {isOnline 
                      ? 'Back Online!' 
                      : 'You\'re Offline'
                    }
                  </h3>
                  
                  <p className="text-sm text-slate-300 mb-4">
                    {isOnline 
                      ? 'Connection restored. All features are available.'
                      : 'No worries! Your Boxing Timer works perfectly offline.'
                    }
                  </p>

                  {/* Offline capabilities */}
                  {!isOnline && showCapabilities && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase">
                        Available Offline:
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                        <div className="flex items-center gap-2">
                          <Timer className="w-3 h-3 text-red-500" />
                          <span>All timer presets</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Volume2 className="w-3 h-3 text-red-500" />
                          <span>Audio alerts</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-3 h-3 text-red-500" />
                          <span>Touch gestures</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3 text-red-500" />
                          <span>Wake lock</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

/**
 * Simple connection status indicator
 */
export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const updateStatus = () => setIsOnline(navigator.onLine);
    
    updateStatus();
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, [isMounted]);

  if (!isMounted) return null;

  return (
    <div className="flex items-center gap-1 text-xs">
      {isOnline ? (
        <>
          <Wifi className="w-3 h-3 text-green-500" />
          <span className="text-green-500">Online</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3 text-orange-500" />
          <span className="text-orange-500">Offline</span>
        </>
      )}
    </div>
  );
}