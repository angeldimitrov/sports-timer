// Create simple audio files using Web Audio API for the Boxing Timer
// This script generates minimal MP3-compatible audio files

const fs = require('fs');
const path = require('path');

// Simple function to create a minimal WAV file (which browsers can play)
function createToneWAV(frequency, duration, sampleRate = 44100) {
  const samples = sampleRate * duration;
  const buffer = Buffer.alloc(44 + samples * 2);
  
  // WAV header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples * 2, 40);
  
  // Generate sine wave
  for (let i = 0; i < samples; i++) {
    const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3;
    const intSample = Math.round(sample * 32767);
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }
  
  return buffer;
}

// Create audio files
const soundsDir = path.join(__dirname, 'public', 'sounds');

// Bell sound - 1000 Hz for 1.2 seconds
const bellWAV = createToneWAV(1000, 1.2);
fs.writeFileSync(path.join(soundsDir, 'bell.wav'), bellWAV);

// Beep sound - 800 Hz for 0.3 seconds
const beepWAV = createToneWAV(800, 0.3);
fs.writeFileSync(path.join(soundsDir, 'beep.wav'), beepWAV);

// Warning sound - 1200 Hz for 0.8 seconds
const warningWAV = createToneWAV(1200, 0.8);
fs.writeFileSync(path.join(soundsDir, 'warning.wav'), warningWAV);

console.log('Created audio files:');
console.log('- bell.wav');
console.log('- beep.wav');  
console.log('- warning.wav');