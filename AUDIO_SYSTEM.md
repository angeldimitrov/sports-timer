# Boxing Timer Audio System

A robust, precise audio system built with Web Audio API for the Boxing Timer application. Provides reliable audio cues for workout timing with comprehensive fallback support.

## Features

### 🔊 **Core Audio Capabilities**
- **Web Audio API** for precise timing and scheduling
- **HTML5 Audio fallback** for broader browser compatibility
- **Synthetic audio generation** when audio files are unavailable
- **Volume control** (0-100%) with smooth transitions
- **Mute/unmute functionality** with instant response
- **Multiple sound types**: bell, beep, warning tones

### ⚡ **Performance & Reliability**
- **Preloading** of audio files for instant playback
- **Browser autoplay policy** handling with user-initiated activation
- **Audio context management** with proper cleanup
- **Error handling** with graceful fallbacks
- **Memory efficient** with proper resource disposal

### 🎯 **Boxing Timer Integration**
- **Round start/end notifications** with clear bell sounds
- **10-second warning system** with distinct warning tones
- **Workout completion signals** with celebratory audio
- **Precise timing synchronization** with timer events
- **Settings persistence** across browser sessions

## Architecture

### Core Components

```
src/lib/audio-manager.ts     # Core audio system implementation
src/hooks/use-audio.ts       # React hook for audio control
src/lib/audio-demo.ts        # Demo utilities and examples
public/sounds/               # Audio files directory
public/audio-test.html       # Standalone test page
```

### AudioManager Class

The `AudioManager` class provides the core audio functionality:

```typescript
import { AudioManager, getAudioManager } from './lib/audio-manager';

// Get singleton instance
const audioManager = getAudioManager({
  enableSyntheticAudio: true,  // Enable tone generation fallback
  enableFallback: true,        // Enable HTML5 Audio fallback
  preloadAll: true,           // Preload all audio files
});

// Initialize (requires user interaction)
await audioManager.initialize();

// Play sounds
await audioManager.play('bell');
await audioManager.play('beep', 2.0); // Scheduled 2 seconds from now
await audioManager.play('warning');

// Volume control
audioManager.setVolume(75);
audioManager.setMuted(true);
```

### useAudio React Hook

The `useAudio` hook provides React integration with state management:

```typescript
import { useAudio } from './hooks/use-audio';

function BoxingTimerComponent() {
  const {
    // State
    isInitialized,
    volume,
    isMuted,
    error,
    
    // Methods
    initialize,
    playRoundStart,
    playRoundEnd,
    playTenSecondWarning,
    setVolume,
    toggleMute,
  } = useAudio();

  // Initialize on user interaction
  const handleStart = async () => {
    if (!isInitialized) {
      await initialize();
    }
    playRoundStart();
  };

  return (
    <div>
      <button onClick={handleStart}>Start Round</button>
      <input 
        type="range" 
        value={volume} 
        onChange={(e) => setVolume(e.target.value)} 
      />
    </div>
  );
}
```

## Audio Files

### Required Files

Place these files in `public/sounds/`:

- **bell.mp3** - Round start/end notifications (1-2 seconds)
- **beep.mp3** - General notifications (0.5-1 second)  
- **warning.mp3** - 10-second warnings (0.5-1 second)

### File Specifications

- **Format**: MP3 (primary), with automatic fallback support
- **Sample Rate**: 44.1 kHz or 48 kHz recommended
- **Bit Rate**: 128 kbps or higher
- **Duration**: Keep under 3 seconds for fast loading
- **Volume**: Normalize to consistent levels

### Fallback Audio

If audio files are missing, the system automatically generates synthetic tones:

- **Bell**: 1000Hz sine wave with envelope (1.2s)
- **Beep**: 800Hz square wave (0.3s)
- **Warning**: 1200Hz sawtooth with pulsing effect (0.8s)

## Usage Examples

### Basic Timer Integration

```typescript
import { useAudio } from './hooks/use-audio';

export function BoxingRound() {
  const audio = useAudio();
  const [timeLeft, setTimeLeft] = useState(180);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          // Play warning at 10 seconds
          if (prev === 11) {
            audio.playTenSecondWarning();
          }
          // Play round end at 0
          if (prev === 1) {
            audio.playRoundEnd();
            setIsActive(false);
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [isActive, timeLeft, audio]);

  const startRound = async () => {
    await audio.initialize();
    audio.playRoundStart();
    setIsActive(true);
  };

  return (
    <div>
      <div className="timer">{formatTime(timeLeft)}</div>
      <button onClick={startRound}>Start Round</button>
    </div>
  );
}
```

### Volume Control Component

```typescript
export function AudioControls() {
  const { volume, isMuted, setVolume, toggleMute, error } = useAudio();

  return (
    <div className="audio-controls">
      <div className="volume-control">
        <label>Volume: {volume}%</label>
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => setVolume(parseInt(e.target.value))}
        />
      </div>
      
      <button onClick={toggleMute}>
        {isMuted ? '🔇 Unmute' : '🔊 Mute'}
      </button>
      
      {error && (
        <div className="error">Audio Error: {error}</div>
      )}
    </div>
  );
}
```

### Workout Sequence

```typescript
export async function runBoxingWorkout(rounds: number) {
  const audio = useAudio();
  await audio.initialize();

  for (let round = 1; round <= rounds; round++) {
    // Round start
    console.log(`Round ${round} starting`);
    await audio.playRoundStart();
    
    // Work period simulation
    await new Promise(resolve => setTimeout(resolve, 170000)); // 2:50
    
    // 10-second warning
    await audio.playTenSecondWarning();
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Round end
    await audio.playRoundEnd();
    console.log(`Round ${round} complete`);
    
    // Rest period (except last round)
    if (round < rounds) {
      await new Promise(resolve => setTimeout(resolve, 60000)); // 1:00 rest
    }
  }
  
  // Workout complete
  await audio.playWorkoutEnd();
  console.log('Workout complete!');
}
```

## Testing

### Browser Test Page

Open `public/audio-test.html` in your browser to test the audio system:

- **Initialize** the audio system
- **Test individual sounds** (bell, beep, warning)
- **Control volume** and mute settings
- **Run comprehensive tests** of all features
- **Simulate boxing workout** with audio cues

### Programmatic Testing

```typescript
import { basicAudioDemo, audioSystemTest, boxingWorkoutDemo } from './lib/audio-demo';

// Run basic demo
await basicAudioDemo();

// Run comprehensive tests
await audioSystemTest();

// Simulate boxing workout
await boxingWorkoutDemo();
```

### Console Testing

If audio demos are loaded, use browser console:

```javascript
// Basic audio functionality
await audioDemo.basic();

// Boxing workout simulation
await audioDemo.workout();

// Comprehensive system tests
await audioDemo.test();
```

## Browser Compatibility

### Supported Browsers
- **Chrome 90+** (Full Web Audio API support)
- **Firefox 88+** (Full Web Audio API support)
- **Safari 14+** (Full Web Audio API support)
- **Edge 90+** (Full Web Audio API support)

### Fallback Support
- **Legacy browsers**: HTML5 Audio fallback
- **No audio files**: Synthetic tone generation
- **Autoplay restrictions**: User-initiated activation

### Known Limitations
- **iOS Safari**: Requires user interaction before audio initialization
- **Background tabs**: Audio may be throttled by browser
- **Autoplay policies**: First audio must be triggered by user action

## Configuration

### AudioManager Options

```typescript
const audioManager = getAudioManager({
  baseUrl: '/sounds',              // Base URL for audio files
  enableFallback: true,            // Enable HTML5 Audio fallback
  preloadAll: true,               // Preload all audio files
  enableSyntheticAudio: true,     // Enable synthetic tone generation
});
```

### Default Settings

- **Volume**: 80%
- **Muted**: false
- **Preload**: enabled
- **Synthetic Audio**: enabled
- **Fallback**: enabled

## Error Handling

The audio system includes comprehensive error handling:

### Initialization Errors
- Missing Web Audio API support → HTML5 Audio fallback
- Context creation failure → Graceful degradation
- File loading errors → Synthetic audio generation

### Playback Errors
- Buffer loading failure → HTML5 Audio attempt
- HTML5 Audio failure → Synthetic tone generation
- Autoplay restriction → User interaction prompt

### Recovery Mechanisms
- Automatic retry with different audio sources
- Graceful fallback to synthetic audio
- Error state reporting via hooks and callbacks

## Performance Considerations

### Optimization Features
- **Audio buffer caching** for instant playback
- **Web Workers compatibility** for timer precision
- **Memory management** with proper cleanup
- **Minimal latency** through preloading

### Best Practices
- Initialize audio system after first user interaction
- Preload audio files during app initialization
- Use Web Audio API for precise timing requirements
- Clean up resources when components unmount

## Development

### Local Development
1. Place audio files in `public/sounds/`
2. Test with `public/audio-test.html`
3. Use browser console for debugging
4. Monitor network requests for file loading

### Production Deployment
1. Ensure all audio files are present
2. Configure proper MIME types on server
3. Enable gzip compression for audio files
4. Test across target browsers and devices

### Debugging Tips
- Check browser console for audio initialization logs
- Use `audioManager.getState()` to inspect current state
- Monitor network tab for audio file loading
- Test with and without audio files present

---

## Quick Start

1. **Install dependencies** (if using in Next.js project)
2. **Add audio files** to `public/sounds/`
3. **Import and use** the useAudio hook:

```typescript
import { useAudio } from './hooks/use-audio';

export function MyTimer() {
  const { initialize, playBell } = useAudio();
  
  const handleStart = async () => {
    await initialize();
    playBell();
  };
  
  return <button onClick={handleStart}>Start</button>;
}
```

The audio system is now ready to provide precise, reliable audio cues for your Boxing Timer application! 🥊🔊