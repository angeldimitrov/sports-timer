/**
 * Audio System Demo and Testing Utilities
 * 
 * This file provides example usage and testing utilities for the Boxing Timer audio system.
 * It demonstrates how to initialize and use the AudioManager and useAudio hook.
 */

import { AudioManager, getAudioManager, AudioType } from './audio-manager';

/**
 * Demo: Basic AudioManager Usage
 * Shows how to initialize and use the AudioManager directly
 */
export async function basicAudioDemo(): Promise<void> {
  console.log('🔊 Starting Audio Manager Demo...');

  // Get the audio manager instance
  const audioManager = getAudioManager({
    enableSyntheticAudio: true, // Enable synthetic audio for demo
    enableFallback: true,
    preloadAll: true,
  });

  try {
    // Initialize the audio system (requires user interaction)
    console.log('Initializing audio system...');
    await audioManager.initialize();
    
    console.log('Audio system initialized successfully!');
    console.log('Audio state:', audioManager.getState());

    // Test volume control
    console.log('Testing volume control...');
    audioManager.setVolume(50);
    console.log('Volume set to 50%');

    // Test each sound type with delays
    console.log('Playing bell sound...');
    await audioManager.play('bell');
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log('Playing beep sound...');
    await audioManager.play('beep');
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    console.log('Playing warning sound...');
    await audioManager.play('warning');
    
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Test mute functionality
    console.log('Testing mute...');
    audioManager.setMuted(true);
    console.log('Audio muted - the next sound should be silent');
    await audioManager.play('beep');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    audioManager.setMuted(false);
    console.log('Audio unmuted');

    // Test scheduled playback (Web Audio API feature)
    if (audioManager.getState().hasWebAudioSupport) {
      console.log('Testing scheduled playback...');
      console.log('Playing 3 beeps with 1-second intervals...');
      
      await audioManager.play('beep', 0);
      await audioManager.play('beep', 1);
      await audioManager.play('beep', 2);
      
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    console.log('✅ Audio demo completed successfully!');
    
  } catch (error) {
    console.error('❌ Audio demo failed:', error);
  }
}

/**
 * Demo: Boxing Timer Workout Simulation
 * Simulates a complete boxing workout with proper audio cues
 */
export async function boxingWorkoutDemo(): Promise<void> {
  console.log('🥊 Starting Boxing Workout Audio Demo...');

  const audioManager = getAudioManager({
    enableSyntheticAudio: true,
  });

  try {
    await audioManager.initialize();
    console.log('Starting 3-round workout simulation...');

    const roundDuration = 5; // 5 seconds per round for demo
    const restDuration = 3;  // 3 seconds rest for demo
    const rounds = 3;

    for (let round = 1; round <= rounds; round++) {
      console.log(`\n🔔 Round ${round} starting...`);
      await audioManager.play('bell'); // Round start bell
      
      // Simulate round progress
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Working... 💪');
      
      // 10-second warning (in real app, this would be at round time - 10 seconds)
      await new Promise(resolve => setTimeout(resolve, roundDuration * 1000 - 2000));
      console.log('⚠️  Warning - round ending soon!');
      await audioManager.play('warning');
      
      // Round end
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log(`🔔 Round ${round} complete`);
      await audioManager.play('bell'); // Round end bell
      
      // Rest period (skip for last round)
      if (round < rounds) {
        console.log(`😴 Rest period ${restDuration} seconds...`);
        await new Promise(resolve => setTimeout(resolve, restDuration * 1000));
      }
    }

    // Workout complete - double bell
    console.log('\n🎉 Workout complete!');
    await audioManager.play('bell');
    await new Promise(resolve => setTimeout(resolve, 500));
    await audioManager.play('bell');
    
    console.log('✅ Boxing workout demo completed!');
    
  } catch (error) {
    console.error('❌ Boxing workout demo failed:', error);
  }
}

/**
 * Demo: Audio System Testing
 * Comprehensive test of all audio system features
 */
export async function audioSystemTest(): Promise<void> {
  console.log('🧪 Running Audio System Tests...');

  const audioManager = getAudioManager({
    enableSyntheticAudio: true,
    enableFallback: true,
  });

  const tests = [
    {
      name: 'Web Audio API Support Detection',
      test: () => {
        const state = audioManager.getState();
        console.log(`Web Audio API supported: ${state.hasWebAudioSupport}`);
        return true;
      }
    },
    {
      name: 'Audio Manager Initialization',
      test: async () => {
        await audioManager.initialize();
        const state = audioManager.getState();
        console.log(`Initialized: ${state.isInitialized}`);
        console.log(`Using synthetic audio: ${state.usingSyntheticAudio}`);
        return state.isInitialized;
      }
    },
    {
      name: 'Volume Control',
      test: () => {
        audioManager.setVolume(75);
        const volume = audioManager.getVolume();
        console.log(`Volume set to: ${volume}%`);
        return volume === 75;
      }
    },
    {
      name: 'Mute Control',
      test: () => {
        audioManager.setMuted(true);
        const muted1 = audioManager.isMuted();
        audioManager.toggleMute();
        const muted2 = audioManager.isMuted();
        console.log(`Mute test: ${muted1} -> ${muted2}`);
        return muted1 === true && muted2 === false;
      }
    },
    {
      name: 'Audio Playback Test',
      test: async () => {
        const types: AudioType[] = ['bell', 'beep', 'warning'];
        for (const type of types) {
          console.log(`Testing ${type} playback...`);
          await audioManager.play(type);
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        return true;
      }
    },
    {
      name: 'Scheduled Playback Test',
      test: async () => {
        if (!audioManager.getState().hasWebAudioSupport) {
          console.log('Skipping scheduled playback test - Web Audio API not supported');
          return true;
        }
        
        console.log('Testing scheduled playback...');
        const startTime = Date.now();
        
        // Schedule 3 beeps at 0.5-second intervals
        await audioManager.play('beep', 0);
        await audioManager.play('beep', 0.5);
        await audioManager.play('beep', 1.0);
        
        // Wait for completion
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        console.log(`Scheduled playback completed in ${duration}ms`);
        
        return duration >= 1400 && duration <= 1700; // Allow some tolerance
      }
    },
    {
      name: 'Audio Ready State',
      test: () => {
        const ready = audioManager.isReady();
        console.log(`Audio system ready: ${ready}`);
        return ready;
      }
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`\n🔍 Running: ${test.name}`);
      const result = await test.test();
      if (result) {
        console.log(`✅ PASS: ${test.name}`);
        passed++;
      } else {
        console.log(`❌ FAIL: ${test.name}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ERROR: ${test.name} - ${error}`);
      failed++;
    }
  }

  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed - check console output for details');
  }
}

/**
 * Demo: React Hook Usage Example
 * Shows how the useAudio hook would be used in a React component
 */
export function createReactAudioExample(): string {
  return `
// Example React component using the useAudio hook
import React, { useEffect } from 'react';
import { useAudio } from '../hooks/use-audio';

export function BoxingTimerAudioControls() {
  const {
    // State
    isInitialized,
    isLoading,
    error,
    volume,
    isMuted,
    hasWebAudioSupport,
    
    // Methods
    initialize,
    playRoundStart,
    playRoundEnd,
    playTenSecondWarning,
    playWorkoutEnd,
    setVolume,
    toggleMute,
    isReady,
  } = useAudio();

  // Initialize audio on first user interaction
  const handleInitialize = async () => {
    try {
      await initialize();
      console.log('Audio system ready!');
    } catch (error) {
      console.error('Failed to initialize audio:', error);
    }
  };

  return (
    <div className="audio-controls">
      <h3>Audio Controls</h3>
      
      {/* Status Display */}
      <div className="audio-status">
        <p>Status: {isInitialized ? '✅ Ready' : '⏳ Not initialized'}</p>
        <p>Web Audio API: {hasWebAudioSupport ? '✅ Supported' : '❌ Not supported'}</p>
        {error && <p className="error">Error: {error}</p>}
        {isLoading && <p>Loading...</p>}
      </div>

      {/* Initialization */}
      {!isInitialized && (
        <button onClick={handleInitialize}>
          Initialize Audio System
        </button>
      )}

      {/* Volume Control */}
      <div className="volume-control">
        <label>
          Volume: {volume}%
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => setVolume(parseInt(e.target.value))}
          />
        </label>
        <button onClick={toggleMute}>
          {isMuted ? '🔇 Unmute' : '🔊 Mute'}
        </button>
      </div>

      {/* Audio Testing */}
      <div className="audio-test">
        <button onClick={() => playRoundStart()}>🔔 Round Start</button>
        <button onClick={() => playRoundEnd()}>🔔 Round End</button>
        <button onClick={() => playTenSecondWarning()}>⚠️ Warning</button>
        <button onClick={() => playWorkoutEnd()}>🎉 Workout End</button>
      </div>
    </div>
  );
}

// Usage in a timer component
export function BoxingTimer() {
  const audio = useAudio();
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
        
        // Play warning at 10 seconds
        if (timeLeft === 10) {
          audio.playTenSecondWarning();
        }
        
        // Play round end at 0
        if (timeLeft === 1) {
          audio.playRoundEnd();
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isActive, timeLeft, audio]);

  const startTimer = async () => {
    // Initialize audio if needed
    if (!audio.isReady()) {
      await audio.initialize();
    }
    
    // Play round start sound
    audio.playRoundStart();
    setIsActive(true);
  };

  return (
    <div className="boxing-timer">
      <div className="timer-display">{timeLeft}</div>
      <button onClick={startTimer}>Start Round</button>
    </div>
  );
}
`;
}

/**
 * Utility: Create Audio Manager with Custom Configuration
 * Helper function to create configured audio manager instances
 */
export function createAudioManager(options: {
  enableSynthetic?: boolean;
  baseUrl?: string;
  volume?: number;
  muted?: boolean;
}): AudioManager {
  const audioManager = getAudioManager({
    enableSyntheticAudio: options.enableSynthetic ?? true,
    baseUrl: options.baseUrl,
    enableFallback: true,
    preloadAll: true,
  });

  // Configure initial settings
  if (options.volume !== undefined) {
    audioManager.setVolume(options.volume);
  }
  
  if (options.muted !== undefined) {
    audioManager.setMuted(options.muted);
  }

  return audioManager;
}

// Export demo functions for use in browser console or testing
if (typeof window !== 'undefined') {
  (window as any).audioDemo = {
    basic: basicAudioDemo,
    workout: boxingWorkoutDemo,
    test: audioSystemTest,
    reactExample: createReactAudioExample,
  };
  
  console.log(`
🔊 Boxing Timer Audio System Demo Available!

Try these demos in the browser console:
- audioDemo.basic()     - Basic audio manager demo
- audioDemo.workout()   - Boxing workout simulation  
- audioDemo.test()      - Comprehensive audio tests
- audioDemo.reactExample() - Get React component example code

Make sure to call these after a user interaction (click, etc.) 
due to browser autoplay policies.
  `);
}