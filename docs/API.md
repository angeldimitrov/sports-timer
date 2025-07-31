# API Documentation 📚

This document provides comprehensive API documentation for the Boxing Timer MVP's core modules and components.

## Table of Contents
- [Timer Engine API](#timer-engine-api)
- [Audio Manager API](#audio-manager-api)
- [Custom Hooks API](#custom-hooks-api)
- [Component API](#component-api)
- [Utility Functions](#utility-functions)
- [Type Definitions](#type-definitions)

## Timer Engine API

### `TimerEngine` Class

The core timer implementation using Web Workers for high-precision timing.

#### Constructor
```typescript
constructor(config: TimerConfig)
```

**Parameters:**
- `config: TimerConfig` - Timer configuration object

**Example:**
```typescript
const timer = new TimerEngine({
  workDuration: 180,      // 3 minutes
  restDuration: 60,       // 1 minute  
  totalRounds: 5,
  enableWarning: true,
  prepDuration: 10        // 10-second preparation
});
```

#### Methods

##### `start(): void`
Starts the timer from the current state.
```typescript
timer.start();
```

##### `pause(): void`
Pauses the timer, maintaining current progress.
```typescript
timer.pause();
```

##### `resume(): void`
Resumes a paused timer.
```typescript
timer.resume();
```

##### `stop(): void`
Stops the timer and resets to preparation phase.
```typescript
timer.stop();
```

##### `reset(): void`
Resets the timer to initial state.
```typescript
timer.reset();
```

##### `getState(): TimerState`
Returns the current timer state.
```typescript
const state = timer.getState();
console.log(state.phase, state.timeRemaining);
```

##### `addEventListener(handler: TimerEventHandler): () => void`
Adds an event listener and returns a cleanup function.
```typescript
const removeListener = timer.addEventListener((event) => {
  console.log('Timer event:', event.type, event.state);
});

// Cleanup
removeListener();
```

##### `updateConfig(config: Partial<TimerConfig>): void`
Updates timer configuration.
```typescript
timer.updateConfig({
  workDuration: 240,  // Change work duration to 4 minutes
  enableWarning: false
});
```

##### `destroy(): void`
Cleans up resources and terminates Web Worker.
```typescript
timer.destroy();
```

#### Events

The timer emits the following events:

| Event Type | Description | Payload |
|------------|-------------|---------|
| `tick` | Fired every second | `{ timeRemaining, progress }` |
| `phaseChange` | When phase changes (work ↔ rest) | `{ phase, round }` |
| `roundComplete` | When a round finishes | `{ round, totalRounds }` |
| `workoutComplete` | When entire workout finishes | `{ totalRounds, duration }` |
| `warning` | 10-second warning before phase end | `{ secondsRemaining, phase }` |
| `preparationStart` | When preparation phase begins | `{ duration }` |
| `error` | When an error occurs | `{ error, context }` |

---

## Audio Manager API

### `AudioManager` Class

Manages audio playback with multiple fallback layers for maximum compatibility.

#### Constructor
```typescript
constructor(config?: AudioManagerConfig)
```

**Parameters:**
- `config?: AudioManagerConfig` - Optional configuration

**Example:**
```typescript
const audioManager = new AudioManager({
  baseUrl: '/sounds',
  enableFallback: true,
  preloadAll: true,
  enableSyntheticAudio: true
});
```

#### Methods

##### `initialize(): Promise<void>`
Initializes the audio system.
```typescript
await audioManager.initialize();
```

##### `play(type: AudioType, when?: number): Promise<void>`
Plays an audio cue.
```typescript
// Play immediately
await audioManager.play('bell');

// Play at specific time (Web Audio API scheduling)
await audioManager.play('beep', audioContext.currentTime + 0.5);
```

##### `setVolume(volume: number): void`
Sets playback volume (0-100).
```typescript
audioManager.setVolume(75); // 75% volume
```

##### `setMuted(muted: boolean): void`
Mutes or unmutes audio.
```typescript
audioManager.setMuted(true);  // Mute
audioManager.setMuted(false); // Unmute
```

##### `getState(): AudioState`
Returns current audio system state.
```typescript
const state = audioManager.getState();
console.log(`Volume: ${state.volume}%, Muted: ${state.isMuted}`);
```

##### `isReady(): boolean`
Checks if audio system is ready for playback.
```typescript
if (audioManager.isReady()) {
  await audioManager.play('bell');
}
```

##### `preloadAudio(type: AudioType): Promise<void>`
Preloads specific audio file.
```typescript
await audioManager.preloadAudio('roundStart');
```

##### `destroy(): void`
Cleans up audio resources.
```typescript
audioManager.destroy();
```

#### Audio Types

| Type | File | Usage |
|------|------|-------|
| `bell` | `bell.mp3` | Round start/end |
| `beep` | `warning-beep.mp3` | Warnings |
| `warning` | `warning-beep.mp3` | 10-second countdown |
| `roundStart` | `round-starts.mp3` | "Round starts" announcement |
| `roundEnd` | `end-of-the-round.mp3` | "End of round" announcement |
| `tenSecondWarning` | `ten-seconds.mp3` | "Ten seconds" announcement |
| `getReady` | `get-ready.mp3` | "Get ready" announcement |
| `rest` | `rest.mp3` | "Rest" announcement |
| `workoutComplete` | `workout-complete.mp3` | "Workout complete" |
| `greatJob` | `great-job.mp3` | "Great job" encouragement |

---

## Custom Hooks API

### `useTimer` Hook

Manages timer state and provides timer controls.

#### Usage
```typescript
const timer = useTimer({
  preset: 'intermediate',
  onEvent: (event) => console.log('Timer event:', event)
});
```

#### Parameters
- `options: UseTimerOptions`
  - `preset?: PresetType` - Timer preset ('beginner', 'intermediate', 'advanced')
  - `config?: TimerConfig` - Custom timer configuration
  - `onEvent?: (event: TimerEvent) => void` - Event handler

#### Return Value
```typescript
interface UseTimerReturn {
  // State
  state: TimerState;
  config: TimerConfig;
  isReady: boolean;
  error: Error | null;
  
  // Controls
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => void;
  
  // Configuration
  updateConfig: (config: Partial<TimerConfig>) => void;
  setPreset: (preset: PresetType) => void;
  
  // Utilities
  formatTime: (seconds: number) => string;
  getPhaseColor: () => string;
  getProgressPercentage: () => number;
}
```

#### Example
```typescript
function TimerComponent() {
  const timer = useTimer({
    preset: 'intermediate',
    onEvent: (event) => {
      if (event.type === 'roundComplete') {
        console.log(`Round ${event.payload.round} completed!`);
      }
    }
  });
  
  return (
    <div>
      <h1>{timer.formatTime(timer.state.timeRemaining)}</h1>
      <button onClick={timer.start} disabled={!timer.isReady}>
        Start
      </button>
      <button onClick={timer.pause}>Pause</button>
    </div>
  );
}
```

### `useAudio` Hook

Provides audio controls and state management.

#### Usage
```typescript
const audio = useAudio();
```

#### Return Value
```typescript
interface UseAudioReturn {
  // State
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  volume: number;
  isMuted: boolean;
  hasWebAudioSupport: boolean;
  
  // Initialization
  initialize: () => Promise<void>;
  
  // Playback
  play: (type: AudioType, when?: number) => Promise<void>;
  playBell: (when?: number) => Promise<void>;
  playBeep: (when?: number) => Promise<void>;
  playWarning: (when?: number) => Promise<void>;
  
  // Timer-specific methods
  playRoundStart: (when?: number) => Promise<void>;
  playRoundEnd: (when?: number) => Promise<void>;
  playWorkoutEnd: (when?: number) => Promise<void>;
  playTenSecondWarning: (when?: number) => Promise<void>;
  
  // Controls
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  toggleMute: () => void;
  
  // Utilities
  preloadAudio: (type: AudioType) => Promise<void>;
  isReady: () => boolean;
}
```

### `useWakeLock` Hook

Manages screen wake lock to prevent device sleep during workouts.

#### Usage
```typescript
const wakeLock = useWakeLock({
  autoLock: true,
  lockCondition: isTimerRunning,
  onLockAcquired: () => console.log('Screen will stay on'),
  onLockReleased: () => console.log('Screen can sleep')
});
```

#### Parameters
```typescript
interface UseWakeLockOptions {
  autoLock?: boolean;
  lockCondition?: boolean;
  onLockAcquired?: () => void;
  onLockReleased?: () => void;
  onError?: (error: Error) => void;
}
```

#### Return Value
```typescript
interface UseWakeLockReturn {
  isLocked: boolean;
  isSupported: boolean;
  error: Error | null;
  requestWakeLock: () => Promise<boolean>;
  releaseWakeLock: () => Promise<void>;
  toggleWakeLock: () => Promise<void>;
}
```

### `usePWA` Hook

Manages Progressive Web App functionality.

#### Usage
```typescript
const pwa = usePWA();
```

#### Return Value
```typescript
interface UsePWAReturn {
  // Installation
  isInstallable: boolean;
  isInstalled: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
  install: () => Promise<boolean>;
  
  // State
  isStandalone: boolean;
  isOffline: boolean;
  
  // Service Worker
  swRegistration: ServiceWorkerRegistration | null;
  swUpdateAvailable: boolean;
  updateServiceWorker: () => Promise<void>;
  
  // Utilities
  share: (data: ShareData) => Promise<boolean>;
  canShare: boolean;
}
```

### `useMobileGestures` Hook

Handles touch gestures for mobile devices.

#### Usage
```typescript
const gestures = useMobileGestures({
  onSwipeLeft: () => timer.start(),
  onSwipeRight: () => timer.pause(),
  onDoubleTap: () => timer.reset()
});
```

---

## Component API

### Timer Components

#### `TimerDisplay`
Large countdown display component.

**Props:**
```typescript
interface TimerDisplayProps {
  timeRemaining: number;
  phase: TimerPhase;
  round: number;
  totalRounds: number;
  isRunning: boolean;
  className?: string;
}
```

#### `TimerControls`
Timer control buttons (Start, Pause, Stop, Reset).

**Props:**
```typescript
interface TimerControlsProps {
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onReset: () => void;
  isRunning: boolean;
  isPaused: boolean;
  canStart: boolean;
  className?: string;
}
```

#### `PresetSelector` 
Workout preset selection component.

**Props:**
```typescript
interface PresetSelectorProps {
  selectedPreset: PresetType;
  onPresetChange: (preset: PresetType) => void;
  disabled?: boolean;
  className?: string;
}
```

#### `SettingsDialog`
Timer configuration dialog.

**Props:**
```typescript
interface SettingsDialogProps {
  config: TimerConfig;
  onConfigChange: (config: Partial<TimerConfig>) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

### PWA Components

#### `InstallPrompt`
PWA installation prompt component.

**Props:**
```typescript
interface InstallPromptProps {
  onInstall: () => Promise<void>;
  onDismiss: () => void;
  className?: string;
}
```

#### `UpdateNotification`
Service worker update notification.

**Props:**
```typescript
interface UpdateNotificationProps {
  onUpdate: () => Promise<void>;
  onDismiss: () => void;
  className?: string;
}
```

#### `OfflineIndicator`
Network status indicator.

**Props:**
```typescript
interface OfflineIndicatorProps {
  isOffline: boolean;
  className?: string;
}
```

---

## Utility Functions

### Path Utilities (`src/lib/get-base-path.ts`)

#### `getBasePath(): string`
Returns the application's base path based on environment.
```typescript
const basePath = getBasePath(); // '' in dev, '/sports-timer' in production
```

#### `getPublicPath(path: string): string`  
Returns the full public asset path.
```typescript
const soundPath = getPublicPath('/sounds/bell.mp3');
// Development: '/sounds/bell.mp3'
// Production: '/sports-timer/sounds/bell.mp3'
```

### Timer Utilities (`src/lib/utils.ts`)

#### `formatTime(seconds: number): string`
Formats seconds into MM:SS format.
```typescript
formatTime(125); // "02:05"
formatTime(65);  // "01:05"
formatTime(5);   // "00:05"
```

#### `getPhaseColor(phase: TimerPhase): string`
Returns CSS color class for timer phase.
```typescript
getPhaseColor('work');        // "text-red-500"
getPhaseColor('rest');        // "text-green-500"  
getPhaseColor('preparation'); // "text-yellow-500"
```

#### `calculateWorkoutDuration(config: TimerConfig): number`
Calculates total workout duration in seconds.
```typescript
const duration = calculateWorkoutDuration({
  workDuration: 180,
  restDuration: 60,
  totalRounds: 5,
  prepDuration: 10
});
// Returns: (180 + 60) * 5 + 10 = 1210 seconds
```

#### `isValidTimerConfig(config: Partial<TimerConfig>): boolean`
Validates timer configuration.
```typescript
const isValid = isValidTimerConfig({
  workDuration: 180,
  restDuration: 60,
  totalRounds: 5
}); // true
```

### Audio Utilities

#### `getAudioManager(config?: AudioManagerConfig): AudioManager`
Returns singleton AudioManager instance.
```typescript
const audioManager = getAudioManager({
  baseUrl: '/custom-sounds',
  enableFallback: true
});
```

#### `resetAudioManager(): void`
Resets the singleton AudioManager (mainly for testing).
```typescript
resetAudioManager(); // Forces new instance on next getAudioManager() call
```

---

## Type Definitions

### Core Types

#### `TimerConfig`
```typescript
interface TimerConfig {
  /** Work period duration in seconds (60-600) */
  workDuration: number;
  /** Rest period duration in seconds (15-300) */
  restDuration: number;
  /** Total number of rounds (1-20) */
  totalRounds: number;
  /** Whether to enable 10-second warning */
  enableWarning: boolean;
  /** Preparation period duration in seconds (0-60) */
  prepDuration?: number;
}
```

#### `TimerState`
```typescript
interface TimerState {
  /** Current timer status */
  status: TimerStatus;
  /** Current phase (work, rest, preparation) */
  phase: TimerPhase;
  /** Current round number (1-based) */
  currentRound: number;
  /** Time remaining in current period (milliseconds) */
  timeRemaining: number;
  /** Total elapsed time for current period (milliseconds) */
  timeElapsed: number;
  /** Progress percentage (0-1) for current period */
  progress: number;
  /** Whether 10-second warning has been triggered */
  warningTriggered: boolean;
  /** Total workout progress (0-1) */
  workoutProgress: number;
}
```

#### `TimerEvent`
```typescript
interface TimerEvent {
  type: 'tick' | 'phaseChange' | 'roundComplete' | 'workoutComplete' | 'warning' | 'error' | 'preparationStart';
  state: TimerState;
  payload?: any;
}
```

### Union Types

#### `TimerStatus`
```typescript
type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';
```

#### `TimerPhase`  
```typescript
type TimerPhase = 'preparation' | 'work' | 'rest';
```

#### `AudioType`
```typescript
type AudioType = 
  | 'bell' 
  | 'beep' 
  | 'warning'
  | 'roundStart'
  | 'roundEnd' 
  | 'tenSecondWarning'
  | 'getReady'
  | 'rest'
  | 'workoutComplete'
  | 'greatJob';
```

#### `PresetType`
```typescript
type PresetType = 'beginner' | 'intermediate' | 'advanced';
```

### Configuration Types

#### `AudioManagerConfig`
```typescript
interface AudioManagerConfig {
  /** Base URL for audio files */
  baseUrl?: string;
  /** Enable HTML5 Audio fallback */
  enableFallback?: boolean;
  /** Preload all audio files on initialization */
  preloadAll?: boolean;
  /** Enable synthetic audio generation */
  enableSyntheticAudio?: boolean;
  /** Initial volume (0-100) */
  initialVolume?: number;
  /** Start muted */
  startMuted?: boolean;
}
```

#### `AudioState`
```typescript
interface AudioState {
  /** Current volume (0-100) */
  volume: number;
  /** Whether audio is muted */
  isMuted: boolean;
  /** Whether audio system is initialized */
  isInitialized: boolean;
  /** Whether Web Audio API is supported */
  hasWebAudioSupport: boolean;
}
```

### PWA Types

#### `PWAState`
```typescript
interface PWAState {
  /** Whether app is installed as PWA */
  isInstalled: boolean;
  /** Whether running in standalone mode */
  isStandalone: boolean;
  /** Whether device is offline */
  isOffline: boolean;
  /** Current session ID */
  sessionId: string;
}
```

---

## Error Handling

### Common Error Types

#### `TimerError`
```typescript
class TimerError extends Error {
  constructor(message: string, public context?: any) {
    super(message);
    this.name = 'TimerError';
  }
}
```

#### `AudioError`
```typescript
class AudioError extends Error {
  constructor(message: string, public audioType?: AudioType) {
    super(message);
    this.name = 'AudioError';
  }
}
```

### Error Recovery

All APIs implement graceful error recovery:
- **Timer Engine**: Falls back to `setInterval` if Web Worker fails
- **Audio Manager**: Multiple fallback layers for audio playback
- **Wake Lock**: Graceful degradation when API unavailable
- **PWA Features**: Progressive enhancement approach

### Debugging

Enable debug mode by setting localStorage:
```javascript
localStorage.setItem('debug', 'boxing-timer:*');
```

This enables detailed console logging for all modules.