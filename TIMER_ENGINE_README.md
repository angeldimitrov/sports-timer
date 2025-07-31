# Boxing Timer Engine

A precise, reliable timer engine for the Boxing Timer MVP using Web Workers for ±100ms accuracy.

## Core Components

### 1. Web Worker (`/public/workers/timer-worker.js`)
- High-precision timing using `performance.now()`
- Drift compensation to maintain accuracy over time
- Self-correcting intervals to prevent cumulative timing errors
- Handles browser tab visibility changes and background execution

### 2. Timer Engine (`/src/lib/timer-engine.ts`)
- Main timer logic with Web Worker integration
- Manages round timing, rest periods, and workout state
- Event-driven architecture for UI updates
- Automatic round progression and workout completion
- Browser compatibility and error handling

### 3. React Hook (`/src/hooks/use-timer.ts`)
- Clean React interface for timer state management
- Automatic cleanup on component unmount
- Formatted time display utilities
- Error handling and recovery
- Support for presets and custom configurations

### 4. Utilities (`/src/lib/utils.ts`)
- Time formatting functions
- Configuration validation
- Preset configurations
- Browser capability detection

## Features

### Precision Timing
- **±100ms accuracy** using Web Workers
- High-resolution timing with `performance.now()`
- Drift compensation for long-running timers
- Self-correcting intervals to prevent timing errors

### Boxing Workout Support
- **Work periods**: 1-10 minutes configurable
- **Rest periods**: 15 seconds - 5 minutes configurable
- **Round count**: 1-20 rounds
- **10-second warning** before period ends
- **Automatic phase transitions** (work ↔ rest)

### Browser Compatibility
- **Tab visibility handling** - maintains accuracy when tab is hidden
- **Background execution** - continues timing when browser is backgrounded
- **Graceful degradation** - handles missing Web Worker support
- **Error recovery** - robust error handling and fallback mechanisms

### Preset Configurations
- **Beginner**: 3 rounds, 2min work, 1min rest
- **Intermediate**: 5 rounds, 3min work, 1min rest
- **Advanced**: 12 rounds, 3min work, 1min rest

## Usage Examples

### Direct Timer Engine Usage
```typescript
import { TimerEngine, createBoxingTimer } from './src/lib/timer-engine';

// Create with preset
const timer = createBoxingTimer('intermediate');

// Add event listener
const removeListener = timer.addEventListener((event) => {
  console.log('Timer event:', event.type, event.state);
});

// Control timer
timer.start();
timer.pause();
timer.resume();
timer.stop();

// Cleanup
removeListener();
timer.destroy();
```

### React Hook Usage
```typescript
import { useBoxingTimer } from './src/hooks/use-timer';

function TimerComponent() {
  const timer = useBoxingTimer('intermediate', {
    onEvent: (event) => {
      if (event.type === 'warning') {
        // Handle 10-second warning
      }
    }
  });

  return (
    <div>
      <div>{timer.formattedTimeRemaining}</div>
      <div>Round {timer.state.currentRound} of {timer.config.totalRounds}</div>
      <div>Phase: {timer.state.phase}</div>
      
      <button onClick={timer.start} disabled={timer.isRunning}>
        Start
      </button>
      <button onClick={timer.pause} disabled={!timer.isRunning}>
        Pause
      </button>
      <button onClick={timer.resume} disabled={!timer.isPaused}>
        Resume
      </button>
      <button onClick={timer.stop}>
        Stop
      </button>
    </div>
  );
}
```

### Custom Configuration
```typescript
import { useCustomTimer } from './src/hooks/use-timer';
import { validateTimerConfig } from './src/lib/utils';

const customConfig = {
  workDuration: 240, // 4 minutes
  restDuration: 90,  // 1.5 minutes  
  totalRounds: 8,
  enableWarning: true
};

// Validate configuration
const validation = validateTimerConfig(customConfig);
if (!validation.isValid) {
  console.error('Invalid config:', validation.errors);
}

const timer = useCustomTimer(customConfig);
```

## Event System

The timer engine uses an event-driven architecture with the following events:

- **`tick`**: Regular timer updates (every 10ms)
- **`phaseChange`**: When switching between work/rest phases
- **`roundComplete`**: When a round is completed
- **`workoutComplete`**: When the entire workout is finished
- **`warning`**: 10-second warning before phase ends
- **`error`**: Error conditions and recovery

## Performance Requirements

- **Timer Accuracy**: ±100ms precision maintained
- **Resource Usage**: Minimal CPU overhead using Web Workers
- **Memory Management**: Proper cleanup prevents memory leaks
- **Browser Support**: Chrome 90+, Firefox 88+, Safari 14+

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Hook    │◄──►│   Timer Engine   │◄──►│   Web Worker    │
│   (use-timer)   │    │ (timer-engine)   │    │ (timer-worker)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ React Component │    │  Event System    │    │ High-Res Timing │
│    (UI Layer)   │    │ (State Updates)  │    │ (±100ms accuracy)│
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## File Structure

```
src/
├── hooks/
│   └── use-timer.ts           # React hook for timer state management
├── lib/
│   ├── timer-engine.ts        # Core timer logic with Web Worker integration
│   └── utils.ts              # Utility functions and validation
└── types/
    └── timer.d.ts            # TypeScript type definitions

public/
└── workers/
    └── timer-worker.js       # Web Worker for precise timing
```

## Next Steps

The timer engine is ready for integration with:

1. **Audio System** - Connect to `audio-manager.ts` for bell sounds and warnings
2. **UI Components** - Build timer display, controls, and settings components
3. **Local Storage** - Add settings persistence with `use-local-storage.ts`
4. **PWA Features** - Integration with service workers and mobile optimizations

The timer engine provides a solid, tested foundation for building the complete Boxing Timer MVP with reliable, precise timing as the core requirement.