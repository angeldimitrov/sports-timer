# Audio Files for Boxing Timer

This directory contains the audio files used by the Boxing Timer application.

## Required Files

The following audio files are expected by the AudioManager:

### 1. bell.mp3
- **Purpose**: Round start/end notifications
- **Duration**: 1-2 seconds
- **Characteristics**: Clear, attention-grabbing bell sound
- **Usage**: Played at the beginning and end of each round

### 2. beep.mp3
- **Purpose**: General timer notifications
- **Duration**: 0.5-1 second
- **Characteristics**: Short, crisp beep sound
- **Usage**: For various timer events and confirmations

### 3. warning.mp3
- **Purpose**: 10-second warning before round ends
- **Duration**: 0.5-1 second
- **Characteristics**: Distinct warning tone (different from beep)
- **Usage**: Played 10 seconds before the end of each work period

## Audio Specifications

For optimal performance and compatibility:

- **Format**: MP3 (with fallback support for other formats)
- **Sample Rate**: 44.1 kHz or 48 kHz
- **Bit Rate**: 128 kbps or higher
- **Channels**: Mono or Stereo
- **Duration**: Keep files short (under 3 seconds) for quick loading

## Implementation Notes

The AudioManager will:
1. Attempt to preload all audio files on initialization
2. Use Web Audio API for precise timing when available
3. Fallback to HTML5 Audio for broader browser support
4. Handle missing files gracefully (with console warnings)

## Replacement Instructions

To replace audio files:
1. Ensure new files match the expected filenames exactly
2. Test in multiple browsers to ensure compatibility
3. Keep file sizes reasonable for fast loading
4. Consider different volume levels - the app provides volume control

## Creating Your Own Audio Files

You can create custom audio files using:
- **Audacity** (free, cross-platform)
- **GarageBand** (Mac)
- **Logic Pro** (Mac)
- **Adobe Audition** (subscription)
- Online generators for simple tones

### Tips for Good Timer Audio:
- Make sounds clearly distinguishable from each other
- Avoid sounds that are too jarring or unpleasant
- Test at different volume levels
- Consider the environment where the timer will be used
- Ensure sounds are not copyrighted if distributing

## Browser Compatibility

The audio system supports:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Files are tested with the Web Audio API and HTML5 Audio fallback.