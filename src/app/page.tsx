'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTimer } from '@/hooks/use-timer';
import { usePresetPersistence } from '@/hooks/use-preset-persistence';
import { useAudio } from '@/hooks/use-audio';
import { useWakeLock } from '@/hooks/use-wake-lock';
import { useMobileGestures } from '@/hooks/use-mobile-gestures';
import { usePWA } from '@/hooks/use-pwa';
import { TimerDisplay } from '@/components/timer/timer-display';
import { TimerControls } from '@/components/timer/timer-controls';
import { PresetSelector } from '@/components/timer/preset-selector';
import { TimerEvent } from '@/lib/timer-engine';

// PWA and mobile components
import { PWAManager } from '@/components/pwa/pwa-manager';
import { PWAStatus, PWAStatusBadge } from '@/components/pwa/pwa-status';
import { InstallBadge } from '@/components/pwa/install-prompt';
// import { UpdateNotification, UpdateBadge } from '@/components/pwa/update-notification'; // Disabled for cleaner UX
import { 
  MobileTimerEnhancements, 
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

  const audio = useAudio();
  
  // Store audio reference to avoid recreating onEvent callback
  const audioRef = useRef(audio);
  audioRef.current = audio;

  // Preset persistence for remembering user selection
  const presetPersistence = usePresetPersistence();

  // Initialize timer and audio systems
  const timer = useTimer({
    preset: presetPersistence.getInitialPreset(), // Use persisted preset or default to beginner
    onEvent: useCallback((event: TimerEvent) => {
      try {
        // Handle timer events for audio integration with correct boxing timer logic
        
        // Safely handle audio playback with error handling
        const safePlayAudio = async (audioType: string) => {
          try {
            await audioRef.current.play(audioType as 'bell' | 'roundStart' | 'roundEnd' | 'rest' | 'getReady' | 'tenSecondWarning' | 'workoutComplete' | 'greatJob');
          } catch {
            // Audio playback failed silently
          }
        };
        
        switch (event.type) {
        case 'preparationStart':
          // Play "GET READY" when preparation phase starts
          safePlayAudio('getReady');
          break;
          
        case 'phaseChange':
          // Phase transitions with proper boxing timer sounds
          if (event.payload?.newPhase === 'work') {
            // Entering work phase - round is starting
            safePlayAudio('bell'); // Bell sound
            setTimeout(() => {
              safePlayAudio('roundStart'); // "Round starts" announcement
            }, 500);
          } else if (event.payload?.newPhase === 'rest') {
            // Entering rest phase - round just ended  
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
          // 10-second warning - voice announcement only to avoid artifacts
          if (event.state?.phase === 'work') {
            // 10 seconds left in work phase
            safePlayAudio('tenSecondWarning'); // "Ten seconds" only
          } else if (event.state?.phase === 'rest') {
            // 10 seconds left in rest phase - next round coming
            safePlayAudio('tenSecondWarning'); // "Ten seconds" only
          }
          break;
          
        case 'workoutComplete':
          // Workout finished
          safePlayAudio('workoutComplete'); // "Workout complete"
          setTimeout(() => {
            safePlayAudio('greatJob'); // "Great job!"
          }, 2500);
          break;
      }
      } catch {
        // Timer event handler error occurred silently
      }
    }, [])
  });

  // PWA state management
  usePWA({
    onInstallSuccess: () => {
      // Boxing Timer installed successfully
    },
    onUpdateAvailable: () => {
      // Update available
    }
  });

  // Wake lock for keeping screen on during workouts
  useWakeLock({
    autoLock: true,
    lockCondition: timer.isRunning,
    onLockAcquired: () => {
      // Screen will stay on during workout
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
      
    }
  }, []);


  // Handle URL params for preset when timer becomes ready
  useEffect(() => {
    if (timer.isReady && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const preset = urlParams.get('preset') as 'beginner' | 'intermediate' | 'advanced' | 'custom';
      
      if (preset && ['beginner', 'intermediate', 'advanced', 'custom'].includes(preset)) {
        timer.loadPreset(preset);
        presetPersistence.setSelectedPreset(preset);
        // Clear the URL parameter to prevent re-triggering
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.isReady]); // Only depend on timer readiness

  // Handle preset selection
  const handlePresetSelect = (preset: 'beginner' | 'intermediate' | 'advanced' | 'custom') => {
    timer.loadPreset(preset);
    presetPersistence.setSelectedPreset(preset);
  };

  // Handle custom preset edit
  const handleCustomPresetEdit = () => {
    // Navigate to settings page in edit mode
    router.push('/settings?edit=true');
  };

  // Handle custom preset creation
  const handleCustomPresetCreate = () => {
    // Navigate to settings page in create mode
    router.push('/settings'); // No edit param = create mode
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
              selectedPreset={presetPersistence.selectedPreset}
              onPresetSelect={handlePresetSelect}
              onCustomPresetEdit={handleCustomPresetEdit}
              onCustomPresetCreate={handleCustomPresetCreate}
              disabled={timer.isRunning}
              isInitialized={presetPersistence.isInitialized}
            />
          </div>
        </div>
      </div>
    </main>
  );
}