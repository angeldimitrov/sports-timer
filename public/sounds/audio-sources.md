# Audio File Sources and Alternatives

Since audio files cannot be created programmatically, here are recommended sources and alternatives for the required audio files:

## Quick Setup Options

### Option 1: Use Web Audio API Generated Tones (Recommended for Development)
The AudioManager can be extended to generate synthetic tones using oscillators:

```javascript
// Add this method to AudioManager for development
generateTone(frequency, duration, type = 'sine') {
  if (!this.audioContext) return;
  
  const oscillator = this.audioContext.createOscillator();
  const gainNode = this.audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(this.gainNode);
  
  oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
  oscillator.type = type;
  
  gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
  
  oscillator.start();
  oscillator.stop(this.audioContext.currentTime + duration);
}
```

### Option 2: Free Audio Resources

#### bell.mp3 alternatives:
- **Freesound.org**: Search "boxing bell" or "gym bell"
- **Zapsplat**: Professional sound effects (free with account)
- **YouTube Audio Library**: Royalty-free sounds
- **Suggested frequencies**: 800-1200Hz for clear bell tones

#### beep.mp3 alternatives:
- **Simple beep**: 1000Hz sine wave, 0.3 seconds
- **Online generators**: Use "Online Tone Generator" websites
- **Audacity**: Generate > Tone > 1000Hz, 0.3s duration

#### warning.mp3 alternatives:
- **Different pitch**: 1500Hz for distinction from beep
- **Pulse tone**: Rapid beeping (3-4 beeps in 0.8 seconds)
- **Lower tone**: 600Hz for warning feeling

## Recommended Websites for Audio Files

1. **Freesound.org** (Creative Commons licensed)
   - Search: "bell", "beep", "warning"
   - Filter by duration (under 3 seconds)
   - Choose CC0 (public domain) for commercial use

2. **Zapsplat.com** (Free with registration)
   - Professional quality
   - Excellent boxing/gym sound effects
   - Clear licensing terms

3. **Pixabay.com** (Free, no attribution required)
   - Good selection of notification sounds
   - MP3 format available
   - Commercial use allowed

4. **OpenGameArt.org** (Free game assets)
   - UI sound effects
   - Various licenses (check each file)

## Generate Your Own

### Using Audacity (Free):
1. Open Audacity
2. Generate > Tone
3. Configure:
   - **Bell**: Sine wave, 1000Hz, 1.5 seconds, fade out
   - **Beep**: Square wave, 800Hz, 0.3 seconds
   - **Warning**: Sawtooth wave, 1200Hz, 0.5 seconds, pulse
4. Export as MP3

### Online Tone Generators:
- **tonegenerator.com**: Simple sine wave generator
- **szynalski.com/tone-generator**: Advanced options
- **onlinetonegenerator.com**: Direct MP3 export

## File Placement

Once you have the audio files:
1. Place them in `/public/sounds/` directory
2. Ensure exact filenames: `bell.mp3`, `beep.mp3`, `warning.mp3`
3. Test by opening http://localhost:3000/sounds/bell.mp3 in browser

## Testing Setup

To test without actual files, you can modify the AudioManager to use generated tones temporarily:

```javascript
// In audio-manager.ts, add fallback tone generation
private generateTone(type: AudioType): void {
  if (!this.audioContext || !this.gainNode) return;
  
  const frequencies = {
    bell: 1000,
    beep: 800,
    warning: 1200
  };
  
  const oscillator = this.audioContext.createOscillator();
  oscillator.connect(this.gainNode);
  oscillator.frequency.setValueAtTime(frequencies[type], this.audioContext.currentTime);
  oscillator.start();
  oscillator.stop(this.audioContext.currentTime + 0.5);
}
```

This ensures the audio system works immediately for development and testing purposes.