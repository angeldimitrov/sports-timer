'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTimer } from '@/hooks/use-timer';
import { useAudio } from '@/hooks/use-audio';
import { useWakeLock } from '@/hooks/use-wake-lock';
import { useMobileGestures } from '@/hooks/use-mobile-gestures';
import { usePWA } from '@/hooks/use-pwa';
import { TimerDisplay } from '@/components/timer/timer-display';
import { TimerControls } from '@/components/timer/timer-controls';
import { PresetSelector } from '@/components/timer/preset-selector';
import { SettingsDialog } from '@/components/timer/settings-dialog';
import { TimerConfig } from '@/types/timer';
import { TimerEvent } from '@/lib/timer-engine';

// PWA and mobile components
import { InstallPrompt, InstallBadge } from '@/components/pwa/install-prompt';
import { UpdateNotification } from '@/components/pwa/update-notification';
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
  // Settings dialog state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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
      // Handle timer events for audio integration with correct boxing timer logic
      console.log('[Audio] Timer event:', event.type, event.payload, event.state?.phase);
      
      // Safely handle audio playback with error handling
      const safePlayAudio = async (audioType: string) => {
        try {
          await audio.play(audioType as 'bell' | 'roundStart' | 'roundEnd' | 'rest' | 'getReady' | 'tenSecondWarning' | 'workoutComplete' | 'greatJob');
        } catch (error) {
          console.warn(`Failed to play ${audioType} audio:`, error);
        }
      };
      
      switch (event.type) {
        case 'preparationStart':
          // Play "GET READY" when preparation phase starts
          console.log('[Audio] Playing: GET READY');
          safePlayAudio('getReady');
          break;
          
        case 'phaseChange':
          console.log('[Audio] Phase change to:', event.payload?.newPhase);
          // Phase transitions with proper boxing timer sounds
          if (event.payload?.newPhase === 'work') {
            // Entering work phase - round is starting
            console.log('[Audio] Playing: ROUND STARTS + BELL');
            safePlayAudio('bell'); // Bell sound
            setTimeout(() => {
              safePlayAudio('roundStart'); // "Round starts" announcement
            }, 500);
          } else if (event.payload?.newPhase === 'rest') {
            // Entering rest phase - round just ended  
            console.log('[Audio] Playing: END OF ROUND + BELL + REST');
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
          console.log('[Audio] 10-second warning in phase:', event.state?.phase);
          // 10-second warning - voice announcement only to avoid artifacts
          if (event.state?.phase === 'work') {
            // 10 seconds left in work phase
            console.log('[Audio] Playing: WORK WARNING');
            safePlayAudio('tenSecondWarning'); // "Ten seconds" only
          } else if (event.state?.phase === 'rest') {
            // 10 seconds left in rest phase - next round coming
            console.log('[Audio] Playing: REST WARNING');
            safePlayAudio('tenSecondWarning'); // "Ten seconds" only
          }
          break;
          
        case 'workoutComplete':
          // Workout finished
          console.log('[Audio] Playing: WORKOUT COMPLETE');
          safePlayAudio('workoutComplete'); // "Workout complete"
          setTimeout(() => {
            safePlayAudio('greatJob'); // "Great job!"
          }, 2500);
          break;
      }
    }, [audio])
  });

  // PWA state management
  usePWA({
    onInstallSuccess: () => {
      console.log('[PWA] Boxing Timer installed successfully!');
    },
    onUpdateAvailable: () => {
      console.log('[PWA] Update available');
    }
  });

  // Wake lock for keeping screen on during workouts
  useWakeLock({
    autoLock: true,
    lockCondition: timer.isRunning,
    onLockAcquired: () => {
      console.log('[WakeLock] Screen will stay on during workout');
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
      onSwipe: (gesture) => {
        if (gesture.direction === 'up' && audio.volume < 100) {
          audio.setVolume(Math.min(100, audio.volume + 10));
        } else if (gesture.direction === 'down' && audio.volume > 0) {
          audio.setVolume(Math.max(0, audio.volume - 10));
        }
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

  // Handle custom settings update
  const handleSettingsUpdate = (config: Partial<TimerConfig>) => {
    timer.updateConfig(config);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 relative overflow-hidden">
      {/* Premium background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800/20 via-transparent to-transparent" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
      {/* PWA Features */}
      <InstallPrompt showDelay={20000} />
      <InstallBadge />
      <UpdateNotification showChangelog={true} />
      
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
              audio={audio} 
              onSettingsClick={() => setIsSettingsOpen(true)}
            />

            {/* Preset Selector */}
            <PresetSelector
              currentConfig={timer.config}
              onPresetSelect={handlePresetSelect}
              disabled={timer.isRunning}
            />
          </div>
        </div>

        {/* Settings Dialog */}
        <SettingsDialog
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          config={timer.config}
          onConfigUpdate={handleSettingsUpdate}
          audioVolume={audio.volume}
          audioMuted={audio.isMuted}
          onVolumeChange={audio.setVolume}
          onMutedChange={audio.setMuted}
        />
      </div>
    </main>
  );
}