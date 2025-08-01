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
 * Touch gesture indicator overlay
 */
export function TouchGestureIndicator() {
  const [showIndicators, setShowIndicators] = useState(true);

  useEffect(() => {
    // Hide indicators after 5 seconds
    const timer = setTimeout(() => {
      setShowIndicators(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  if (!showIndicators) return null;

  return (
    <div className="fixed inset-0 z-20 pointer-events-none animate-fade-in-up">
      {/* Central tap indicator - Premium design */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        <div className="animate-pulse-slow">
          <div className={cn(
            'w-24 h-24 rounded-full glass border border-white/20',
            'flex items-center justify-center mb-4',
            'shadow-premium-lg ring-1 ring-white/10'
          )}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center">
              <span className="text-white text-lg">👆</span>
            </div>
          </div>
          <div className="glass-dark rounded-lg px-3 py-2 ring-1 ring-white/10">
            <p className="text-white/80 text-sm font-medium">Tap to control timer</p>
          </div>
        </div>
      </div>

      {/* Volume swipe indicators - Refined */}
      <div className="absolute top-1/2 right-6 -translate-y-1/2">
        <div className="animate-pulse-slow">
          <div className={cn(
            'glass-dark rounded-xl p-4 ring-1 ring-white/10',
            'shadow-premium flex items-center gap-3'
          )}>
            <div className="text-blue-400 text-lg">👆</div>
            <div className="flex flex-col gap-1">
              <div className="w-8 h-0.5 bg-gradient-to-r from-blue-400 to-transparent rounded"></div>
              <div className="w-6 h-0.5 bg-gradient-to-r from-blue-400 to-transparent rounded"></div>
            </div>
            <p className="text-white/70 text-xs font-medium">Volume</p>
          </div>
        </div>
      </div>

      {/* Long press reset indicator - Elegant */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2">
        <div className="animate-pulse-slow text-center">
          <div className={cn(
            'w-20 h-20 rounded-full glass border-2 border-dashed border-white/20',
            'flex items-center justify-center mb-3 shadow-premium',
            'ring-1 ring-white/5'
          )}>
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-red-400 to-red-600 flex items-center justify-center">
              <span className="text-white text-sm">👇</span>
            </div>
          </div>
          <div className="glass-dark rounded-lg px-3 py-1 ring-1 ring-white/10">
            <p className="text-white/70 text-xs font-medium">Hold to reset</p>
          </div>
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
        const memInfo = (performance as any).memory;
        const usedMB = Math.round(memInfo.usedJSHeapSize / 1048576);
        setMemory(usedMB);
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