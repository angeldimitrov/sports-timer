/**
 * Mobile Timer Enhancements Component
 * 
 * Adds mobile-specific features and optimizations to the boxing timer.
 * Provides native-like touch interactions and visual feedback for mobile users.
 * 
 * Features:
 * - Full-screen mode toggle
 * - Screen orientation lock
 * - Touch gesture indicators
 * - Battery status display
 * - Network status indicator
 * - Haptic feedback controls
 */

'use client';

import { useState, useEffect } from 'react';
import { createModuleLogger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Maximize2, 
  Minimize2, 
  RotateCw, 
  Battery, 
  Wifi, 
  WifiOff,
  Vibrate,
  VolumeX
} from 'lucide-react';

export interface MobileEnhancementsProps {
  /** Whether to show mobile features */
  showFeatures?: boolean;
  /** Callback when fullscreen is toggled */
  onFullscreenToggle?: (isFullscreen: boolean) => void;
  /** Whether haptic feedback is enabled */
  hapticEnabled?: boolean;
  /** Callback to toggle haptic feedback */
  onHapticToggle?: (enabled: boolean) => void;
}

/**
 * Mobile Timer Enhancements
 * 
 * Provides mobile-specific controls and indicators for the boxing timer.
 * Enhances the user experience on mobile devices with native-like features.
 */
const log = createModuleLogger('MobileTimerEnhancements');

export function MobileTimerEnhancements({
  showFeatures = true,
  onFullscreenToggle,
  hapticEnabled = true,
  onHapticToggle
}: MobileEnhancementsProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [canVibrate, setCanVibrate] = useState(false);

  /**
   * Initialize mobile features
   */
  useEffect(() => {
    // Check vibration support
    setCanVibrate('vibrate' in navigator);

    // Check network status
    setIsOnline(navigator.onLine);
    
    // Check initial orientation
    updateOrientation();

    // Battery status
    if ('getBattery' in navigator) {
      (navigator as { getBattery?: () => Promise<{
        level: number;
        charging: boolean;
        addEventListener: (event: string, handler: () => void) => void;
      }> }).getBattery?.().then((battery) => {
        setBatteryLevel(Math.round(battery.level * 100));
        setIsCharging(battery.charging);

        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });

        battery.addEventListener('chargingchange', () => {
          setIsCharging(battery.charging);
        });
      }).catch((err) => {
        log.warn('Battery API not available:', err);
      });
    }

    // Fullscreen detection
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    // Network status listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Orientation change listener
    const handleOrientationChange = () => updateOrientation();

    // Add event listeners
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, []);

  /**
   * Update orientation state
   */
  const updateOrientation = () => {
    const isPortrait = window.innerHeight > window.innerWidth;
    setOrientation(isPortrait ? 'portrait' : 'landscape');
  };

  /**
   * Toggle fullscreen mode
   */
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        
        // Try to lock orientation to portrait on mobile
        if ('orientation' in screen && screen.orientation && 'lock' in screen.orientation) {
          try {
            await (screen.orientation as unknown as { lock: (orientation: string) => Promise<void> }).lock('portrait');
          } catch {
            log.debug('Orientation lock not supported');
          }
        }
      } else {
        await document.exitFullscreen();
      }
      
      if (onFullscreenToggle) {
        onFullscreenToggle(!isFullscreen);
      }
    } catch (err) {
      log.error('Fullscreen toggle failed:', err);
    }
  };

  /**
   * Get battery icon based on level
   */
  const getBatteryIcon = () => {
    if (!batteryLevel) return <Battery className="w-4 h-4" />;
    
    const color = batteryLevel > 20 ? 'text-green-500' : 'text-red-500';
    
    return (
      <div className="flex items-center gap-1">
        <Battery className={`w-4 h-4 ${color}`} />
        <span className="text-xs">{batteryLevel}%</span>
        {isCharging && <span className="text-xs">⚡</span>}
      </div>
    );
  };

  if (!showFeatures) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-30 pointer-events-none">
      <div className="flex justify-between items-start">
        {/* Status indicators (left side) - Hidden in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="flex flex-wrap gap-2 pointer-events-auto">
            {/* Network status */}
            <Badge 
              variant={isOnline ? 'default' : 'destructive'} 
              className="bg-slate-800/80 backdrop-blur-sm"
            >
              {isOnline ? (
                <Wifi className="w-3 h-3 mr-1" />
              ) : (
                <WifiOff className="w-3 h-3 mr-1" />
              )}
              {isOnline ? 'Online' : 'Offline'}
            </Badge>

            {/* Battery status */}
            {batteryLevel !== null && (
              <Badge className="bg-slate-800/80 backdrop-blur-sm">
                {getBatteryIcon()}
              </Badge>
            )}

            {/* Orientation */}
            <Badge className="bg-slate-800/80 backdrop-blur-sm">
              <RotateCw className="w-3 h-3 mr-1" />
              {orientation}
            </Badge>
          </div>
        )}

        {/* Controls (right side) - Premium glass design */}
        <div className="flex gap-2 pointer-events-auto">
          {/* Fullscreen toggle - Essential for mobile experience */}
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleFullscreen}
            className={cn(
              'glass rounded-xl shadow-premium',
              'hover:bg-slate-700/60 hover:shadow-premium-lg',
              'ring-1 ring-white/10 transition-all duration-300'
            )}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
          
          {/* Haptic feedback toggle - Development only */}
          {canVibrate && process.env.NODE_ENV === 'development' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onHapticToggle?.(!hapticEnabled)}
              className={cn(
                'glass rounded-xl shadow-premium',
                'hover:bg-slate-700/60 hover:shadow-premium-lg',
                'ring-1 ring-white/10 transition-all duration-300'
              )}
              aria-label={hapticEnabled ? 'Disable haptic feedback' : 'Enable haptic feedback'}
            >
              {hapticEnabled ? (
                <Vibrate className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}


/**
 * Mobile performance monitor
 */
export function MobilePerformanceMonitor() {
  const [fps, setFps] = useState(60);
  const [memory, setMemory] = useState<number | null>(null);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();

    const measureFps = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        setFps(Math.round((frameCount * 1000) / (currentTime - lastTime)));
        frameCount = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(measureFps);
    };

    const rafId = requestAnimationFrame(measureFps);

    // Memory monitoring (if available)
    if ('memory' in performance) {
      const checkMemory = () => {
        const memInfo = (performance as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
        if (memInfo) {
          const usedMB = Math.round(memInfo.usedJSHeapSize / 1048576);
          setMemory(usedMB);
        }
      };

      checkMemory();
      const memInterval = setInterval(checkMemory, 2000);

      return () => {
        cancelAnimationFrame(rafId);
        clearInterval(memInterval);
      };
    }

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, []);

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 text-xs font-mono">
      <div className="bg-black/80 text-green-400 p-2 rounded">
        <div>FPS: {fps}</div>
        {memory && <div>MEM: {memory}MB</div>}
      </div>
    </div>
  );
}