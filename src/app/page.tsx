'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Settings } from 'lucide-react';
import { useTimer } from '@/hooks/use-timer';
import { useAudio } from '@/hooks/use-audio';
import { useWakeLock } from '@/hooks/use-wake-lock';
import { useMobileGestures } from '@/hooks/use-mobile-gestures';
import { usePWA } from '@/hooks/use-pwa';
import { TimerDisplay } from '@/components/timer/timer-display';
import { TimerControls } from '@/components/timer/timer-controls';
import { PresetSelector } from '@/components/timer/preset-selector';
import { Button } from '@/components/ui/button';
import { TimerEvent } from '@/lib/timer-engine';
import { createModuleLogger } from '@/lib/logger';
import { cn } from '@/lib/utils';

// Initialize module logger
const log = createModuleLogger('MainPage');

// PWA and mobile components
import { PWAManager } from '@/components/pwa/pwa-manager';
import { PWAStatus, PWAStatusBadge } from '@/components/pwa/pwa-status';
import { InstallBadge } from '@/components/pwa/install-prompt';
// import { UpdateNotification, UpdateBadge } from '@/components/pwa/update-notification'; // Disabled for cleaner UX
import { 
  MobileTimerEnhancements, 
  TouchGestureIndicator,
  MobilePerformanceMonitor 
} from '@/components/timer/mobile-timer-enhancements';

// Global feature detection interface
declare global {
  interface Window {
    BOXING_TIMER_FEATURES?: {
      isMobile?: boolean;
      hasTouch?: boolean;
      isStandalone?: boolean;
      supportsWakeLock?: boolean;
    };
  }
}

/**
 * Boxing Timer MVP Main Page
 * 
 * Main application page that integrates all timer components into a functional
 * boxing workout timer with premium UI design and comprehensive functionality.
 * 
 * Features:
 * - Complete timer functionality with work/rest periods
 * - Audio system integration with bells and warnings
 * - Preset workout configurations (Beginner, Intermediate, Advanced)
 * - Custom timer settings with comprehensive controls
 * - Mobile-responsive design with touch-friendly controls
 * - Premium visual design with smooth animations
 */
export default function Home() {
  const router = useRouter();
  const [deviceInfo, setDeviceInfo] = useState<{
    isMobile?: boolean;
    hasTouch?: boolean;
    isStandalone?: boolean;
    supportsWakeLock?: boolean;
  } | null>(null);
  const [showMobileFeatures, setShowMobileFeatures] = useState(false);
  const [showGestureIndicators, setShowGestureIndicators] = useState(false);

  const audio = useAudio();

  // Initialize timer and audio systems
  const timer = useTimer({
    preset: 'intermediate', // Default to intermediate preset
    onEvent: useCallback((event: TimerEvent) => {
      try {
        // Handle timer events for audio integration with correct boxing timer logic
        log.debug('Timer event:', event.type, event.payload, event.state?.phase);
        
        // Safely handle audio playback with error handling
        const safePlayAudio = async (audioType: string) => {
          try {
            await audio.play(audioType as 'bell' | 'roundStart' | 'roundEnd' | 'rest' | 'getReady' | 'tenSecondWarning' | 'workoutComplete' | 'greatJob');
          } catch (error) {
            log.warn(`Failed to play ${audioType} audio:`, error);
          }
        };
        
        switch (event.type) {
        case 'preparationStart':
          // Play "GET READY" when preparation phase starts
          log.debug('Playing: GET READY');
          safePlayAudio('getReady');
          break;
          
        case 'phaseChange':
          log.debug('Phase change to:', event.payload?.newPhase);
          // Phase transitions with proper boxing timer sounds
          if (event.payload?.newPhase === 'work') {
            // Entering work phase - round is starting
            log.debug('Playing: ROUND STARTS + BELL');
            safePlayAudio('bell'); // Bell sound
            setTimeout(() => {
              safePlayAudio('roundStart'); // "Round starts" announcement
            }, 500);
          } else if (event.payload?.newPhase === 'rest') {
            // Entering rest phase - round just ended  
            log.debug('Playing: END OF ROUND + BELL + REST');
            safePlayAudio('bell'); // Bell sound
            setTimeout(() => {
              safePlayAudio('roundEnd'); // "End of the round" announcement
            }, 500);
            setTimeout(() => {
              safePlayAudio('rest'); // "REST" announcement
            }, 2000);
          }
          break;
          
        case 'warning':
          log.debug('10-second warning in phase:', event.state?.phase);
          // 10-second warning - voice announcement only to avoid artifacts
          if (event.state?.phase === 'work') {
            // 10 seconds left in work phase
            log.debug('Playing: WORK WARNING');
            safePlayAudio('tenSecondWarning'); // "Ten seconds" only
          } else if (event.state?.phase === 'rest') {
            // 10 seconds left in rest phase - next round coming
            log.debug('Playing: REST WARNING');
            safePlayAudio('tenSecondWarning'); // "Ten seconds" only
          }
          break;
          
        case 'workoutComplete':
          // Workout finished
          log.debug('Playing: WORKOUT COMPLETE');
          safePlayAudio('workoutComplete'); // "Workout complete"
          setTimeout(() => {
            safePlayAudio('greatJob'); // "Great job!"
          }, 2500);
          break;
      }
      } catch (error) {
        log.error('Timer event handler error:', error);
      }
    }, [audio])
  });

  // PWA state management
  usePWA({
    onInstallSuccess: () => {
      log.info('Boxing Timer installed successfully!');
    },
    onUpdateAvailable: () => {
      log.info('Update available');
    }
  });

  // Wake lock for keeping screen on during workouts
  useWakeLock({
    autoLock: true,
    lockCondition: timer.isRunning,
    onLockAcquired: () => {
      log.info('Screen will stay on during workout');
    }
  });

  // Mobile gestures for timer control
  const gestures = useMobileGestures({
    target: '.timer-display-container',
    enabled: deviceInfo?.isMobile || false,
    callbacks: {
      onTap: () => {
        if (timer.isRunning) {
          timer.pause();
        } else if (timer.isPaused) {
          timer.resume();
        } else {
          timer.start();
        }
      },
      onSwipe: () => {
        // Swipe gestures reserved for future functionality
      },
      onLongPress: () => {
        if (window.confirm('Reset timer to beginning?')) {
          timer.reset();
        }
      }
    }
  });

  // Detect device capabilities on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const features = window.BOXING_TIMER_FEATURES || {};
      setDeviceInfo(features);
      setShowMobileFeatures(features.isMobile || features.hasTouch || false);
      
      // Show gesture indicators for first-time mobile users
      if ((features.isMobile || features.hasTouch) && !localStorage.getItem('gesture-tutorial-seen')) {
        setShowGestureIndicators(true);
        localStorage.setItem('gesture-tutorial-seen', 'true');
      }
    }
  }, []);


  // Check URL params for preset
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const preset = urlParams.get('preset') as 'beginner' | 'intermediate' | 'advanced';
      
      if (preset && ['beginner', 'intermediate', 'advanced'].includes(preset)) {
        timer.loadPreset(preset);
      }
    }
  }, [timer]);

  // Handle preset selection
  const handlePresetSelect = (preset: 'beginner' | 'intermediate' | 'advanced') => {
    timer.loadPreset(preset);
  };

  // Handle settings page navigation
  const handleSettingsClick = () => {
    router.push('/settings');
  };

  // Check if returning from settings with updates
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('updated') === 'true') {
        // Clear the URL parameter immediately to prevent infinite loop
        router.replace('/', { scroll: false });
        
        // Reload configuration from localStorage after a short delay
        setTimeout(() => {
          try {
            const saved = localStorage.getItem('boxing-timer-config');
            if (saved) {
              const config = JSON.parse(saved);
              timer.updateConfig(config);
            }
          } catch (error) {
            console.warn('Failed to load updated config:', error);
          }
        }, 100);
      }
    }
  }, [timer, router]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 relative overflow-hidden">
      {/* Premium background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800/20 via-transparent to-transparent" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
      
      {/* Mobile enhancements - Premium and focused (dev only) */}
      {showMobileFeatures && process.env.NODE_ENV === 'development' && (
        <>
          <MobileTimerEnhancements
            showFeatures={true}
            hapticEnabled={gestures.isEnabled}
            onHapticToggle={gestures.setEnabled}
          />
          {showGestureIndicators && <TouchGestureIndicator />}
        </>
      )}
      
      {/* Performance monitor (dev only) */}
      {process.env.NODE_ENV === 'development' && <MobilePerformanceMonitor />}
      
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-7xl">
        {/* PWA Manager - positioned at top of content */}
        <PWAManager />
        
        {/* Premium PWA Components */}
        <PWAStatus 
          position="top-right"
          showConnectionStatus={true}
          enableHaptics={gestures.isEnabled}
        />
        {/* InstallPrompt disabled - using only the red download icon for cleaner UX */}
        {/* UpdateNotification disabled - to prevent any install/update popups for cleaner UX */}
        
        {/* Compact PWA badges for mobile */}
        <div className="fixed top-4 left-4 z-50 flex gap-2">
          <PWAStatusBadge />
          {/* UpdateBadge disabled - to prevent any update popups for cleaner UX */}
        </div>
        <InstallBadge />
        
        {/* Main Timer Interface - Optimized layout */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {/* Timer Display - Maximum prominence and space */}
          <div className="xl:col-span-3 timer-display-container order-1">
            <TimerDisplay timer={timer} />
          </div>

          {/* Controls and Settings Sidebar - Compact and efficient */}
          <div className="xl:col-span-1 space-y-4 order-2 xl:order-2">
            {/* Timer Controls */}
            <TimerControls 
              timer={timer} 
            />

            {/* Preset Selector */}
            <PresetSelector
              currentConfig={timer.config}
              onPresetSelect={handlePresetSelect}
              disabled={timer.isRunning}
            />

            {/* Settings Button - at the very bottom */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={handleSettingsClick}
                variant="outline"
                className={cn(
                  'w-full h-12 rounded-xl font-medium',
                  'glass-dark border-slate-600/50',
                  'hover:bg-slate-700/50 hover:border-slate-500/70',
                  'text-slate-200 hover:text-white',
                  'transition-all duration-300 ease-out shadow-premium-lg',
                  'ring-1 ring-white/5'
                )}
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  );
}