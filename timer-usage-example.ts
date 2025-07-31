/**
 * Boxing Timer Engine Usage Examples
 * 
 * This file demonstrates how to use the timer engine and React hooks
 * for the Boxing Timer MVP. These examples show the core functionality
 * and integration patterns.
 */

import { TimerEngine, createBoxingTimer, TimerConfig } from './src/lib/timer-engine';
import { useTimer, useBoxingTimer, useCustomTimer } from './src/hooks/use-timer';
import { formatTime, validateTimerConfig, TIMER_PRESETS } from './src/lib/utils';

// Example 1: Using Timer Engine directly
function basicTimerEngineExample() {
  // Create custom timer configuration
  const config: TimerConfig = {
    workDuration: 180, // 3 minutes
    restDuration: 60,  // 1 minute
    totalRounds: 5,
    enableWarning: true
  };

  // Create timer engine instance
  const timer = new TimerEngine(config);

  // Add event listener for timer updates
  const removeListener = timer.addEventListener((event) => {
    console.log('Timer Event:', event.type);
    console.log('Current State:', event.state);

    switch (event.type) {
      case 'tick':
        console.log(`Time remaining: ${formatTime(event.state.timeRemaining)}`);
        console.log(`Round: ${event.state.currentRound}, Phase: ${event.state.phase}`);
        break;

      case 'phaseChange':
        console.log(`Phase changed to: ${event.payload?.newPhase}`);
        break;

      case 'roundComplete':
        console.log(`Round ${event.payload?.completedRound} completed!`);
        break;

      case 'workoutComplete':
        console.log('Workout completed!');
        break;

      case 'warning':
        console.log(`Warning: ${event.payload?.secondsRemaining} seconds remaining!`);
        break;

      case 'error':
        console.error('Timer error:', event.payload);
        break;
    }
  });

  // Start the timer
  timer.start();

  // Example of controlling the timer
  setTimeout(() => {
    timer.pause();
    console.log('Timer paused');
  }, 5000);

  setTimeout(() => {
    timer.resume();
    console.log('Timer resumed');
  }, 8000);

  // Clean up when done
  setTimeout(() => {
    removeListener();
    timer.destroy();
  }, 30000);
}

// Example 2: Using preset timers
function presetTimerExample() {
  // Create timer with preset configuration
  const beginnerTimer = createBoxingTimer('beginner');
  
  console.log('Beginner Timer Config:', beginnerTimer.getConfig());
  // Output: { workDuration: 120, restDuration: 60, totalRounds: 3, enableWarning: true }

  const advancedTimer = createBoxingTimer('advanced');
  console.log('Advanced Timer Config:', advancedTimer.getConfig());
  // Output: { workDuration: 180, restDuration: 60, totalRounds: 12, enableWarning: true }

  // Clean up
  beginnerTimer.destroy();
  advancedTimer.destroy();
}

// Example 3: React Hook Usage (in a React component)
function ReactTimerComponent() {
  // Using preset hook
  const beginnerTimer = useBoxingTimer('beginner', {
    autoStart: false,
    onEvent: (event) => {
      if (event.type === 'warning') {
        // Play warning sound or show visual indicator
        console.log('Warning triggered!');
      }
    }
  });

  // Using custom configuration hook
  const customConfig: TimerConfig = {
    workDuration: 240, // 4 minutes
    restDuration: 90,  // 1.5 minutes
    totalRounds: 8,
    enableWarning: true
  };

  const customTimer = useCustomTimer(customConfig, {
    onEvent: (event) => {
      console.log('Custom timer event:', event.type);
    }
  });

  // Generic useTimer hook with configuration
  const genericTimer = useTimer({
    config: {
      workDuration: 300, // 5 minutes
      restDuration: 120, // 2 minutes
      totalRounds: 6,
      enableWarning: false
    },
    autoStart: false
  });

  return {
    // Beginner timer controls and state
    beginnerTimer: {
      ...beginnerTimer,
      // Additional computed values
      totalWorkoutTime: formatTime(
        (beginnerTimer.config.workDuration * beginnerTimer.config.totalRounds + 
         beginnerTimer.config.restDuration * (beginnerTimer.config.totalRounds - 1)) * 1000
      )
    },

    // Custom timer controls and state
    customTimer: {
      ...customTimer,
      isLastRound: customTimer.state.currentRound === customTimer.config.totalRounds
    },

    // Generic timer controls and state
    genericTimer
  };
}

// Example 4: Configuration validation
function configValidationExample() {
  const validConfig: TimerConfig = {
    workDuration: 180,
    restDuration: 60,
    totalRounds: 5,
    enableWarning: true
  };

  const invalidConfig: TimerConfig = {
    workDuration: 30,  // Too short (minimum 60 seconds)
    restDuration: 400, // Too long (maximum 300 seconds)
    totalRounds: 25,   // Too many (maximum 20)
    enableWarning: true
  };

  const validResult = validateTimerConfig(validConfig);
  console.log('Valid config:', validResult);
  // Output: { isValid: true, errors: [] }

  const invalidResult = validateTimerConfig(invalidConfig);
  console.log('Invalid config:', invalidResult);
  // Output: { isValid: false, errors: ['Work duration must be between 1 and 10 minutes', ...] }
}

// Example 5: Preset configurations
function presetConfigExample() {
  console.log('Available presets:');
  
  Object.entries(TIMER_PRESETS).forEach(([key, preset]) => {
    console.log(`${key}: ${preset.name}`);
    console.log(`  Description: ${preset.description}`);
    console.log(`  Work: ${preset.config.workDuration}s, Rest: ${preset.config.restDuration}s`);
    console.log(`  Rounds: ${preset.config.totalRounds}`);
    console.log(`  Total Duration: ${formatTime(
      (preset.config.workDuration * preset.config.totalRounds + 
       preset.config.restDuration * (preset.config.totalRounds - 1)) * 1000
    )}`);
    console.log('');
  });
}

// Example 6: Error handling and browser compatibility
function browserCompatibilityExample() {
  // Check browser capabilities
  const capabilities = {
    webWorkers: typeof Worker !== 'undefined',
    webAudio: typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined',
    pageVisibility: typeof document !== 'undefined' && typeof document.hidden !== 'undefined',
    highResolutionTime: typeof performance !== 'undefined' && typeof performance.now === 'function'
  };

  console.log('Browser capabilities:', capabilities);

  if (!capabilities.webWorkers) {
    console.warn('Web Workers not supported - timer accuracy may be reduced');
  }

  if (!capabilities.highResolutionTime) {
    console.warn('High resolution timing not available');
  }

  // Create timer with error handling
  try {
    const timer = createBoxingTimer('intermediate');
    
    timer.addEventListener((event) => {
      if (event.type === 'error') {
        console.error('Timer error occurred:', event.payload);
        // Handle error - maybe fallback to setTimeout-based timer
      }
    });

    timer.start();
    
    // Clean up after test
    setTimeout(() => timer.destroy(), 5000);
    
  } catch (error) {
    console.error('Failed to create timer:', error);
    // Implement fallback timer or show error to user
  }
}

// Export examples for use
export {
  basicTimerEngineExample,
  presetTimerExample,
  ReactTimerComponent,
  configValidationExample,
  presetConfigExample,
  browserCompatibilityExample
};