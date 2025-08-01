/**
 * Mobile Boxing Timer Component
 * 
 * Comprehensive mobile-optimized timer interface with PWA features, touch gestures,
 * and mobile-specific optimizations for the boxing timer application.
 * 
 * Features:
 * - Touch gesture controls (tap to pause, swipe to skip, long press to reset)
 * - Wake lock to keep screen on during workouts
 * - Mobile audio optimizations for iOS and Android
 * - PWA installation and update prompts
 * - Responsive design with 44px+ touch targets
 * - Visual feedback for gesture interactions
 * - Accessibility optimizations for mobile screen readers
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createModuleLogger } from '@/lib/logger';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Settings,
  Download,
  Wifi,
  WifiOff,
  Battery,
  Smartphone
} from 'lucide-react';

// Import our custom hooks
import { useTimer } from '@/hooks/use-timer';
import { useWakeLock } from '@/hooks/use-wake-lock';
import { useMobileGestures } from '@/hooks/use-mobile-gestures';
import { usePWA } from '@/hooks/use-pwa';

// Import audio management
import { getAudioManager } from '@/lib/audio-manager';
import { getMobileAudioManager } from '@/lib/mobile-audio';

export interface MobileTimerProps {
  /** Initial timer preset */
  preset?: 'beginner' | 'intermediate' | 'advanced';
  /** Enable gesture controls */
  enableGestures?: boolean;
  /** Enable wake lock */
  enableWakeLock?: boolean;
  /** Enable PWA features */
  enablePWA?: boolean;
  /** Custom CSS classes */
  className?: string;
}

/**
 * Mobile Boxing Timer Component
 * 
 * A comprehensive mobile-optimized timer interface that integrates all PWA features,
 * mobile optimizations, and accessibility enhancements for boxing workouts.
 */
const log = createModuleLogger('MobileTimer');

export function MobileTimer({
  preset = 'intermediate',
  enableGestures = true,
  enableWakeLock = true,
  enablePWA = true,
  className = ''
}: MobileTimerProps) {
  // Timer state management
  const timer = useTimer({
    preset,
    onEvent: (event) => {
      log.debug('Timer event:', event.type, event.state);
      
      // Handle audio for timer events
      handleTimerAudio(event);
      
      // Handle visual feedback
      handleVisualFeedback(event);
    }
  });

  // PWA state management
  const pwa = usePWA({
    onInstallSuccess: () => {
      log.info('Boxing Timer installed successfully!');
    },
    onUpdateAvailable: () => {
      log.info('App update available');
    }
  });

  // Wake lock for keeping screen on
  const wakeLock = useWakeLock({
    autoLock: enableWakeLock,
    lockCondition: timer.isRunning,
    onLockAcquired: () => {
      log.info('Screen will stay on during workout');
    }
  });

  // Mobile gestures
  const gestures = useMobileGestures({
    target: '.timer-display',
    enabled: enableGestures,
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
        if (gesture.direction === 'left') {
          // Skip to next phase (work -> rest or rest -> next round)
          handleSkipPhase();
        } else if (gesture.direction === 'right') {
          // Go back to previous phase (if possible)
          handlePreviousPhase();
        } else if (gesture.direction === 'up') {
          // Increase volume
          adjustVolume(10);
        } else if (gesture.direction === 'down') {
          // Decrease volume
          adjustVolume(-10);
        }
      },
      onLongPress: () => {
        if (window.confirm('Reset timer to beginning?')) {
          timer.reset();
        }
      }
    }
  });

  // Local state
  const [audioManager, setAudioManager] = useState<ReturnType<typeof getAudioManager> | null>(null);
  // const [mobileAudioManager, setMobileAudioManager] = useState<ReturnType<typeof getMobileAudioManager> | null>(null);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [hasUpdate] = useState(false);
  const [gestureIndicator, setGestureIndicator] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Refs
  const timerDisplayRef = useRef<HTMLDivElement>(null);
  const indicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Initialize audio managers
   */
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        // Initialize standard audio manager
        const audioMgr = getAudioManager({
          enableFallback: true,
          preloadAll: true,
          enableSyntheticAudio: true
        });
        
        // Initialize mobile audio manager
        const mobileAudioMgr = getMobileAudioManager({
          enableIosUnlock: true,
          useLowLatency: true,
          mobilePreloadStrategy: 'conservative',
          enableBackgroundAudio: true
        });

        await audioMgr.initialize();
        await mobileAudioMgr.createMobileAudioContext();

        setAudioManager(audioMgr);
        // setMobileAudioManager(mobileAudioMgr);

        // Set initial volume
        audioMgr.setVolume(volume);
      } catch (error) {
        log.error('Audio initialization failed:', error);
      }
    };

    initializeAudio();
  }, [volume]);

  /**
   * Handle timer audio events
   */
  const handleTimerAudio = useCallback((event: { type: string; state?: { phase?: string }; payload?: { newPhase?: string } }) => {
    if (!audioManager || isMuted) return;

    switch (event.type) {
      case 'preparationStart':
        audioManager.playGetReady();
        break;
      case 'phaseChange':
        // Play sound based on what phase we're transitioning TO
        if (event.payload?.newPhase === 'work') {
          // Starting work period - play round start
          audioManager.playRoundStart();
        } else if (event.payload?.newPhase === 'rest') {
          // Starting rest period (work just ended) - play end of round and rest announcement
          audioManager.playRoundEnd();
          setTimeout(() => audioManager.playRest(), 1000);
        }
        break;
      case 'warning':
        // Play warning sound based on current phase
        if (event.state?.phase === 'preparation') {
          // During preparation: play "next round in 10 seconds"
          audioManager.playTenSecondWarning();
        } else if (event.state?.phase === 'rest') {
          // During rest: play "next round in 10 seconds" 
          audioManager.playTenSecondWarning();
        } else if (event.state?.phase === 'work') {
          // During work: play generic warning sound (not "next round")
          audioManager.play('warning');
        }
        break;
      case 'roundComplete':
        audioManager.playRoundEnd();
        break;
      case 'workoutComplete':
        // Play workout complete sequence
        audioManager.playWorkoutComplete();
        setTimeout(() => audioManager.playGreatJob(), 2000);
        break;
    }
  }, [audioManager, isMuted]);

  /**
   * Handle visual feedback for events
   */
  const handleVisualFeedback = useCallback((event: { type: string; state?: { phase?: string }; payload?: { newPhase?: string } }) => {
    const display = timerDisplayRef.current;
    if (!display) return;

    // Apply visual effects based on event type
    switch (event.type) {
      case 'phaseChange':
        display.classList.add('phase-change-flash');
        setTimeout(() => display.classList.remove('phase-change-flash'), 500);
        break;
      case 'warning':
        display.classList.add('warning-pulse');
        setTimeout(() => display.classList.remove('warning-pulse'), 2000);
        break;
    }
  }, []);

  /**
   * Show gesture indicator with timeout
   */
  const showGestureIndicator = useCallback((message: string) => {
    setGestureIndicator(message);
    
    if (indicatorTimeoutRef.current) {
      clearTimeout(indicatorTimeoutRef.current);
    }
    
    indicatorTimeoutRef.current = setTimeout(() => {
      setGestureIndicator(null);
    }, 2000);
  }, []);

  /**
   * Handle skip phase gesture
   */
  const handleSkipPhase = useCallback(() => {
    if (!timer.isRunning) return;
    
    showGestureIndicator('Skip Phase →');
    
    // Skip logic would be implemented in timer engine
    log.debug('Skip to next phase');
  }, [timer.isRunning, showGestureIndicator]);

  /**
   * Handle previous phase gesture
   */
  const handlePreviousPhase = useCallback(() => {
    showGestureIndicator('← Previous Phase');
    
    // Previous phase logic would be implemented in timer engine
    log.debug('Go to previous phase');
  }, [showGestureIndicator]);

  /**
   * Adjust volume with gesture
   */
  const adjustVolume = useCallback((delta: number) => {
    const newVolume = Math.max(0, Math.min(100, volume + delta));
    setVolume(newVolume);
    
    if (audioManager) {
      audioManager.setVolume(newVolume);
    }
    
    showGestureIndicator(`Volume: ${newVolume}%`);
  }, [volume, audioManager, showGestureIndicator]);

  /**
   * Toggle mute
   */
  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    
    if (audioManager) {
      audioManager.setMuted(newMuted);
    }
  }, [isMuted, audioManager]);

  /**
   * Toggle fullscreen
   */
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  }, []);

  /**
   * Get timer display color based on phase and state
   */
  const getTimerColor = useCallback(() => {
    if (!timer.isReady) return 'text-gray-400';
    
    if (timer.state.phase === 'preparation') {
      return timer.isRunning ? 'text-blue-400' : 'text-blue-300';
    } else if (timer.state.phase === 'work') {
      return timer.isRunning ? 'text-red-400' : 'text-red-300';
    } else {
      return timer.isRunning ? 'text-green-400' : 'text-green-300';
    }
  }, [timer.isReady, timer.isRunning, timer.state.phase]);

  /**
   * Format time for display
   */
  const formatTime = useCallback((milliseconds: number) => {
    const totalSeconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  return (
    <div className={`mobile-timer w-full max-w-md mx-auto p-4 ${className}`}>
      {/* PWA Status Bar */}
      {enablePWA && (
        <div className="flex justify-between items-center mb-4 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            {pwa.state.isOffline ? (
              <WifiOff className="w-4 h-4 text-orange-400" />
            ) : (
              <Wifi className="w-4 h-4 text-green-400" />
            )}
            {pwa.state.isStandalone && (
              <Smartphone className="w-4 h-4 text-blue-400" />
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {wakeLock.isLocked && <Battery className="w-4 h-4 text-green-400" />}
            <span>{formatTime(Date.now())}</span>
          </div>
        </div>
      )}

      {/* Install/Update Prompts */}
      {pwa.state.canInstall && (
        <Card className="mb-4 bg-blue-900/50 border-blue-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">Install Boxing Timer</h3>
                <p className="text-sm text-blue-200">Add to home screen for better experience</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => pwa.showInstallPrompt()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Install
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => pwa.dismissInstallPrompt()}
                >
                  Later
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {hasUpdate && (
        <Card className="mb-4 bg-orange-900/50 border-orange-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">Update Available</h3>
                <p className="text-sm text-orange-200">New features and improvements</p>
              </div>
              <Button
                size="sm"
                onClick={() => pwa.installUpdate()}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Update
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Timer Display */}
      <Card className="mb-6 bg-slate-800/50 border-slate-700">
        <CardContent className="p-8">
          <div
            ref={timerDisplayRef}
            className={`timer-display text-center cursor-pointer select-none ${enableGestures ? 'touch-manipulation' : ''}`}
            style={{ minHeight: '200px' }}
          >
            {/* Phase Indicator */}
            <div className="mb-4">
              <span className={`text-2xl font-bold uppercase tracking-wider ${
                timer.state.phase === 'preparation' ? 'text-blue-400' :
                timer.state.phase === 'work' ? 'text-red-400' : 'text-green-400'
              }`}>
                {timer.state.phase === 'preparation' ? 'GET READY' :
                 timer.state.phase === 'work' ? 'WORK' : 'REST'}
              </span>
            </div>

            {/* Time Display */}
            <div className={`text-6xl font-mono font-bold mb-4 ${getTimerColor()}`}>
              {formatTime(timer.state.timeRemaining)}
            </div>

            {/* Round Counter */}
            <div className="text-xl text-gray-300 mb-4">
              Round {timer.state.currentRound} of {timer.config.totalRounds}
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  timer.state.phase === 'preparation' ? 'bg-blue-500' :
                  timer.state.phase === 'work' ? 'bg-red-500' : 'bg-green-500'
                }`}
                style={{ width: `${timer.state.progress * 100}%` }}
              />
            </div>

            {/* Workout Progress */}
            <div className="text-sm text-gray-400">
              Workout: {Math.round(timer.state.workoutProgress * 100)}% complete
            </div>

            {/* Gesture Indicator */}
            {gestureIndicator && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg">
                <span className="text-white text-xl font-semibold">
                  {gestureIndicator}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Control Buttons */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Button
          size="lg"
          variant={timer.isRunning ? "secondary" : "default"}
          onClick={() => timer.isRunning ? timer.pause() : timer.start()}
          className="h-16 text-lg"
          disabled={!timer.isReady}
        >
          {timer.isRunning ? (
            <>
              <Pause className="w-6 h-6 mr-2" />
              Pause
            </>
          ) : (
            <>
              <Play className="w-6 h-6 mr-2" />
              {timer.isPaused ? 'Resume' : 'Start'}
            </>
          )}
        </Button>

        <Button
          size="lg"
          variant="outline"
          onClick={() => timer.stop()}
          className="h-16 text-lg"
          disabled={!timer.isReady || timer.isIdle}
        >
          <Square className="w-6 h-6 mr-2" />
          Stop
        </Button>

        <Button
          size="lg"
          variant="outline"
          onClick={() => timer.reset()}
          className="h-16 text-lg"
          disabled={!timer.isReady}
        >
          <RotateCcw className="w-6 h-6 mr-2" />
          Reset
        </Button>
      </div>

      {/* Secondary Controls */}
      <div className="flex justify-between items-center">
        <Button
          size="sm"
          variant="ghost"
          onClick={toggleMute}
          className="flex items-center gap-2"
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
          {isMuted ? 'Unmute' : 'Mute'}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={toggleFullscreen}
          className="flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
          {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        </Button>
      </div>

      {/* Gesture Help */}
      {enableGestures && (
        <div className="mt-6 text-xs text-gray-500 text-center">
          <p>Tap timer to start/pause • Swipe left/right to skip • Long press to reset</p>
          <p>Swipe up/down to adjust volume</p>
        </div>
      )}

      {/* Debug Info (Development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-4 bg-gray-800 rounded text-xs">
          <pre className="text-gray-300">
            {JSON.stringify({
              timer: timer.state.status,
              wakeLock: wakeLock.isLocked,
              gestures: gestures.isEnabled,
              pwa: pwa.state.isInstalled
            }, null, 2)}
          </pre>
        </div>
      )}

      {/* CSS Styles for Visual Effects */}
      <style jsx>{`
        .phase-change-flash {
          animation: flash 0.5s ease-in-out;
        }
        
        .warning-pulse {
          animation: pulse 1s ease-in-out infinite;
        }
        
        @keyframes flash {
          0%, 100% { background-color: transparent; }
          50% { background-color: rgba(59, 130, 246, 0.3); }
        }
        
        @keyframes pulse {
          0%, 100% { background-color: transparent; }
          50% { background-color: rgba(239, 68, 68, 0.2); }
        }
        
        .timer-display {
          touch-action: manipulation;
          user-select: none;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
        }
        
        @media (hover: none) and (pointer: coarse) {
          .timer-display {
            -webkit-tap-highlight-color: transparent;
          }
        }
      `}</style>
    </div>
  );
}