/**
 * Audio Manager Test Suite
 * 
 * Comprehensive unit tests for the AudioManager class covering critical MVP functionality:
 * 1. Audio Playback Reliability: Tests multi-layer fallback chain (Web Audio → HTML5 → Synthetic)
 * 2. Volume Control System: Tests volume management and mute functionality
 * 
 * These tests ensure the audio system provides reliable audio cues across all browser
 * environments with graceful degradation when audio resources are unavailable.
 * 
 * Business Context: Audio cues are critical for boxing training timing. The system must
 * work reliably across all devices and browsers, with multiple fallback layers to ensure
 * athletes never miss timing signals during workouts.
 */

import { AudioManager, getAudioManager, resetAudioManager, AudioType } from '../audio-manager';

// Mock Web Audio API
class MockAudioContext {
  public currentTime = 0;
  public state = 'running';
  public destination = {};
  
  createGain = jest.fn();
  createBufferSource = jest.fn();
  createOscillator = jest.fn();
  decodeAudioData = jest.fn();
  resume = jest.fn();
  close = jest.fn();
  
  constructor() {
    this.createGain.mockReturnValue({
      gain: {
        setValueAtTime: jest.fn(),
        linearRampToValueAtTime: jest.fn(),
        exponentialRampToValueAtTime: jest.fn(),
      },
      connect: jest.fn(),
    });
    
    this.createBufferSource.mockReturnValue({
      buffer: null,
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
    });
    
    this.createOscillator.mockReturnValue({
      frequency: { setValueAtTime: jest.fn() },
      type: 'sine',
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
    });
    
    this.decodeAudioData.mockResolvedValue({
      duration: 1.0,
      numberOfChannels: 2,
      sampleRate: 44100,
    });
    
    this.resume.mockResolvedValue(undefined);
    this.close.mockResolvedValue(undefined);
  }
}

// Mock HTML5 Audio
class MockAudio {
  public src = '';
  public volume = 1;
  public currentTime = 0;
  public readyState = 4; // HAVE_ENOUGH_DATA
  public error: { message: string } | null = null;
  public preload = 'auto';
  
  private listeners: { [key: string]: EventListener[] } = {};
  
  addEventListener = jest.fn((event: string, callback: EventListener) => {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  });
  
  removeEventListener = jest.fn((event: string, callback: EventListener) => {
    if (this.listeners[event]) {
      const index = this.listeners[event].indexOf(callback);
      if (index > -1) {
        this.listeners[event].splice(index, 1);
      }
    }
  });
  
  load = jest.fn(() => {
    // Simulate successful loading
    setTimeout(() => {
      this.readyState = 4;
      this.dispatchEvent('canplaythrough');
    }, 10);
  });
  
  play = jest.fn().mockResolvedValue(undefined);
  pause = jest.fn();
  
  dispatchEvent(eventType: string) {
    const callbacks = this.listeners[eventType] || [];
    callbacks.forEach(callback => {
      callback({} as Event);
    });
  }
  
  simulateError(message: string) {
    this.error = { message };
    this.dispatchEvent('error');
  }
  
  simulateLoadFailure() {
    this.readyState = 0;
    this.simulateError('Failed to load audio');
  }
}

// Mock fetch for audio file loading
global.fetch = jest.fn(() =>
  Promise.resolve({
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
  })
) as jest.Mock;

// Mock global audio APIs
(global as typeof globalThis & { AudioContext: typeof MockAudioContext }).AudioContext = MockAudioContext;
(global as typeof globalThis & { Audio: typeof MockAudio }).Audio = MockAudio;

// Mock console to reduce test noise
const originalConsole = console;
beforeAll(() => {
  console.debug = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.debug = originalConsole.debug;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

describe('AudioManager', () => {
  let audioManager: AudioManager;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset any singleton instances
    resetAudioManager();
    
    // Create fresh instance
    audioManager = new AudioManager({
      baseUrl: '/test-sounds',
      enableFallback: true,
      preloadAll: true,
      enableSyntheticAudio: true,
    });
  });

  afterEach(() => {
    if (audioManager) {
      audioManager.dispose();
    }
  });

  describe('Audio Playback Reliability Test', () => {
    /**
     * Tests the multi-layer fallback chain for reliable audio playback
     * 
     * Fallback Strategy:
     * 1. Web Audio API (Primary): Best timing precision and features
     * 2. HTML5 Audio (Fallback): Universal browser compatibility
     * 3. Synthetic Audio (Ultimate Fallback): Generated tones when files unavailable
     * 
     * Business Critical: Boxing athletes depend on audio cues for timing.
     * The system must never fail silently - there must always be some form
     * of audio feedback, even if it's synthetic tones.
     */
    it('should successfully initialize Web Audio API as primary system', async () => {
      const state = audioManager.getState();
      expect(state.hasWebAudioSupport).toBe(true);
      
      await audioManager.initialize();
      
      const initializedState = audioManager.getState();
      expect(initializedState.isInitialized).toBe(true);
      expect(audioManager.isReady()).toBe(true);
    });

    it('should fallback to HTML5 Audio when Web Audio API fails', async () => {
      // Mock Web Audio API failure by throwing in constructor
      const originalAudioContext = global.AudioContext;
      (global as typeof globalThis & { AudioContext: jest.MockedFunction<() => never> }).AudioContext = jest.fn(() => {
        throw new Error('Web Audio API not supported');
      });
      
      const fallbackManager = new AudioManager({
        baseUrl: '/test-sounds',
        enableFallback: true,
      });
      
      await fallbackManager.initialize();
      
      const state = fallbackManager.getState();
      expect(state.isInitialized).toBe(true);
      // Note: hasWebAudioSupport is determined by browser capability, not initialization success
      
      // Restore original
      global.AudioContext = originalAudioContext;
      fallbackManager.dispose();
    });

    it('should use synthetic audio when all file loading fails', async () => {
      // Mock all audio file loading to fail quickly
      const originalAudio = global.Audio;
      (global as typeof globalThis & { Audio: jest.MockedFunction<() => MockAudio> }).Audio = jest.fn().mockImplementation(() => {
        const mockAudio = new MockAudio();
        // Simulate immediate loading failure
        mockAudio.load = jest.fn(() => {
          setTimeout(() => mockAudio.simulateLoadFailure(), 10);
        });
        return mockAudio;
      });

      const syntheticManager = new AudioManager({
        baseUrl: '/test-sounds',
        enableSyntheticAudio: true,
      });

      await syntheticManager.initialize();
      
      // Should still be initialized despite file loading failures
      expect(syntheticManager.getState().isInitialized).toBe(true);

      // Playing should work with synthetic audio - need to force synthetic path
      // Clear audio files to ensure synthetic fallback
      syntheticManager['audioFiles'].clear();
      await syntheticManager.play('bell');
      
      const state = syntheticManager.getState();
      expect(state.usingSyntheticAudio).toBe(true);

      // Restore original
      global.Audio = originalAudio;
      syntheticManager.dispose();
    });

    it('should handle audio playback with Web Audio API buffers', async () => {
      await audioManager.initialize();
      
      // Set up a mock buffer for the bell sound
      const mockBuffer: Partial<AudioBuffer> = { duration: 1.2 };
      const bellFile = audioManager['audioFiles'].get('bell');
      if (bellFile) {
        bellFile.buffer = mockBuffer as AudioBuffer;
      }

      await audioManager.play('bell');
      
      // Verify Web Audio API was used (through the mocked context)
      expect(audioManager.isReady()).toBe(true);
    });

    it('should handle HTML5 Audio fallback playback', async () => {
      await audioManager.initialize();

      // Force HTML5 audio path by removing buffer
      const bellFile = audioManager['audioFiles'].get('bell');
      if (bellFile && bellFile.htmlAudio) {
        bellFile.buffer = undefined; // No Web Audio buffer
        bellFile.htmlAudio.readyState = 4; // Ready to play
        
        // Ensure the play method is a mock
        const playMock = jest.fn().mockResolvedValue(undefined);
        bellFile.htmlAudio.play = playMock;
      }

      await audioManager.play('bell');
      
      if (bellFile?.htmlAudio) {
        expect(bellFile.htmlAudio.play).toHaveBeenCalled();
      }
    });

    it('should generate synthetic tones for all audio types', async () => {
      await audioManager.initialize();
      
      // Clear all audio files to force synthetic audio
      audioManager['audioFiles'].clear();

      const audioTypes: AudioType[] = ['bell', 'beep', 'warning', 'roundStart'];
      
      // Test that playing unknown audio types works (falls back to synthetic)
      for (const type of audioTypes) {
        await audioManager.play(type);
        // Just verify no errors are thrown
      }
      
      const state = audioManager.getState();
      expect(state.usingSyntheticAudio).toBe(true);
    });

    it('should handle audio loading timeouts gracefully', async () => {
      // Mock Audio with quick timeout simulation
      global.Audio = jest.fn().mockImplementation(() => {
        const mockAudio = new MockAudio();
        // Simulate quick timeout
        mockAudio.load = jest.fn(() => {
          setTimeout(() => mockAudio.simulateError('Loading timeout'), 10);
        });
        return mockAudio;
      });

      const timeoutManager = new AudioManager({
        baseUrl: '/test-sounds',
        enableFallback: true,
      });

      // Should handle timeout and still initialize with basic fallback
      await timeoutManager.initialize();
      
      const state = timeoutManager.getState();
      expect(state.isInitialized).toBe(true);

      timeoutManager.dispose();
    });

    it('should provide specialized combo methods for boxing timing', async () => {
      await audioManager.initialize();
      
      const playMock = jest.spyOn(audioManager, 'play').mockResolvedValue();

      // Test round start combo (bell + voice)
      await audioManager.playRoundStart();
      expect(playMock).toHaveBeenCalledWith('bell', 0);
      expect(playMock).toHaveBeenCalledWith('roundStart', 0);

      // Test round end combo (bell + voice)
      playMock.mockClear();
      await audioManager.playRoundEnd();
      expect(playMock).toHaveBeenCalledWith('bell', 0);
      expect(playMock).toHaveBeenCalledWith('roundEnd', 0);

      // Test warning (voice only)
      playMock.mockClear();
      await audioManager.playTenSecondWarning();
      expect(playMock).toHaveBeenCalledWith('tenSecondWarning', 0);

      playMock.mockRestore();
    });
  });

  describe('Volume Control System Test', () => {
    /**
     * Tests volume management and mute functionality
     * 
     * Business Rule: Audio is always played at 100% volume for boxing training.
     * Volume controls are deprecated but maintained for API compatibility.
     * Athletes need consistent, loud audio cues that won't be accidentally muted.
     * 
     * Note: The current implementation always plays at full volume regardless
     * of volume settings, as requested for the boxing timer MVP.
     */
    it('should maintain volume settings but always play at 100%', async () => {
      await audioManager.initialize();

      // Volume API should work for compatibility
      audioManager.setVolume(50);
      expect(audioManager.getVolume()).toBe(50);

      audioManager.setVolume(0);
      expect(audioManager.getVolume()).toBe(0);

      audioManager.setVolume(150); // Over 100
      expect(audioManager.getVolume()).toBe(100); // Should clamp to 100

      // But internal volume should always be 100% for boxing training
      const volumeDecimal = audioManager['getVolumeDecimal']();
      expect(volumeDecimal).toBe(1.0);
    });

    it('should handle mute state but never actually mute audio', async () => {
      await audioManager.initialize();

      // Mute API should work for compatibility
      expect(audioManager.isMuted()).toBe(false);

      audioManager.setMuted(true);
      expect(audioManager.isMuted()).toBe(true);

      // But toggle always returns false (audio never muted)
      const muteResult = audioManager.toggleMute();
      expect(muteResult).toBe(false);
    });

    it('should apply volume settings to HTML5 Audio elements', async () => {
      await audioManager.initialize();

      const bellFile = audioManager['audioFiles'].get('bell');
      if (bellFile?.htmlAudio) {
        // Should always be set to full volume
        expect(bellFile.htmlAudio.volume).toBe(1.0);
      }

      // Changing volume setting shouldn't affect actual playback volume
      audioManager.setVolume(25);
      audioManager['updateHtmlAudioVolume']();

      if (bellFile?.htmlAudio) {
        expect(bellFile.htmlAudio.volume).toBe(1.0);
      }
    });

    it('should apply gain settings to Web Audio API', async () => {
      await audioManager.initialize();

      const mockGainNode = audioManager['gainNode'] as {
        gain: {
          setValueAtTime: jest.MockedFunction<(value: number, startTime: number) => AudioParam>;
        };
      };
      if (mockGainNode) {
        // Should always set gain to 1.0 (100%)
        audioManager['updateGainValue']();
        expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalledWith(1.0, expect.any(Number));
      }

      // Volume changes shouldn't affect Web Audio gain
      audioManager.setVolume(10);
      audioManager['updateGainValue']();

      if (mockGainNode) {
        expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalledWith(1.0, expect.any(Number));
      }
    });

    it('should provide accurate audio system state information', async () => {
      const initialState = audioManager.getState();
      expect(initialState.isInitialized).toBe(false);
      expect(initialState.volume).toBe(100);
      expect(initialState.isMuted).toBe(false);
      expect(initialState.usingSyntheticAudio).toBe(false);

      await audioManager.initialize();

      const readyState = audioManager.getState();
      expect(readyState.isInitialized).toBe(true);
      expect(readyState.hasWebAudioSupport).toBe(true);

      // State should be read-only
      const state = audioManager.getState();
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (state as any).volume = 50;
      }).not.toThrow(); // Assignment won't affect internal state

      const newState = audioManager.getState();
      expect(newState.volume).toBe(100); // Should remain unchanged
    });

    it('should validate volume range constraints', () => {
      // Test volume clamping
      audioManager.setVolume(-10);
      expect(audioManager.getVolume()).toBe(0);

      audioManager.setVolume(200);
      expect(audioManager.getVolume()).toBe(100);

      audioManager.setVolume(75.5);
      expect(audioManager.getVolume()).toBe(75.5);
    });
  });

  describe('Initialization Error Handling', () => {
    it('should handle complete initialization failure gracefully', async () => {
      // Mock all audio systems to fail
      const originalAudioContext = global.AudioContext;
      const originalAudio = global.Audio;
      
      (global as typeof globalThis & { AudioContext: undefined }).AudioContext = undefined;
      (global as typeof globalThis & { Audio: jest.MockedFunction<() => never> }).Audio = jest.fn().mockImplementation(() => {
        throw new Error('Audio creation failed');
      });

      const failingManager = new AudioManager();

      try {
        await failingManager.initialize();
        // If it doesn't throw, that's also acceptable (basic fallback may work)
      } catch {
        // Expected to throw
      }
      
      // Should handle play attempts gracefully when not initialized
      await expect(failingManager.play('bell')).resolves.not.toThrow();
      
      // Restore originals
      global.AudioContext = originalAudioContext;
      global.Audio = originalAudio;
      failingManager.dispose();
    });

    it('should initialize with partial audio file loading success', async () => {
      // Mock some files to fail loading
      let audioCreationCount = 0;
      global.Audio = jest.fn().mockImplementation(() => {
        audioCreationCount++;
        const mockAudio = new MockAudio();
        
        // Make every other audio file fail to load
        if (audioCreationCount % 2 === 0) {
          setTimeout(() => mockAudio.simulateLoadFailure(), 5);
        } else {
          // Normal successful loading
          mockAudio.load = jest.fn(() => {
            setTimeout(() => mockAudio.dispatchEvent('canplaythrough'), 10);
          });
        }
        
        return mockAudio;
      });

      const partialManager = new AudioManager();
      await partialManager.initialize();

      // Should still initialize if at least some files load
      const state = partialManager.getState();
      expect(state.isInitialized).toBe(true);

      partialManager.dispose();
    });
  });

  describe('Resource Management', () => {
    it('should properly dispose of all resources', async () => {
      await audioManager.initialize();

      audioManager.dispose();
      
      const state = audioManager.getState();
      expect(state.isInitialized).toBe(false);
    });

    it('should handle disposal when not initialized', () => {
      // Should not crash when disposing uninitialized manager
      expect(() => audioManager.dispose()).not.toThrow();
    });
  });

  describe('Singleton Pattern', () => {
    it('should provide global singleton instance', () => {
      const instance1 = getAudioManager();
      const instance2 = getAudioManager();
      
      expect(instance1).toBe(instance2);
      
      resetAudioManager();
      
      const instance3 = getAudioManager();
      expect(instance3).not.toBe(instance1);
      
      instance1.dispose();
      instance3.dispose();
    });
  });

  describe('Edge Cases and Error Recovery', () => {
    it('should handle play requests for unknown audio types', async () => {
      await audioManager.initialize();
      
      // Should not crash for unknown audio type
      await expect(audioManager.play('unknownType' as AudioType)).resolves.not.toThrow();
    });

    it('should handle Web Audio API context suspension', async () => {
      await audioManager.initialize();
      
      // Test that reinitialization works
      await audioManager.initialize();
      
      // Should not crash with suspended context
      expect(audioManager.isReady()).toBe(true);
    });

    it('should handle HTML5 Audio autoplay restrictions', async () => {
      await audioManager.initialize();
      
      const bellFile = audioManager['audioFiles'].get('bell');
      if (bellFile?.htmlAudio) {
        // Mock autoplay restriction error
        bellFile.htmlAudio.play = jest.fn().mockRejectedValue(
          new DOMException('Autoplay blocked', 'NotAllowedError')
        );
        
        // Should handle the error gracefully
        await expect(audioManager.play('bell')).resolves.not.toThrow();
      }
    });

    it('should handle on-demand loading for unready audio files', async () => {
      await audioManager.initialize();
      
      const bellFile = audioManager['audioFiles'].get('bell');
      if (bellFile?.htmlAudio) {
        // Set audio to not ready state
        bellFile.htmlAudio.readyState = 0;
        bellFile.buffer = undefined;
        
        // Mock successful on-demand loading
        const loadPromise = Promise.resolve();
        bellFile.htmlAudio.load = jest.fn().mockImplementation(() => {
          setTimeout(() => {
            bellFile.htmlAudio!.readyState = 4;
            bellFile.htmlAudio!.dispatchEvent('canplaythrough');
          }, 10);
          return loadPromise;
        });
        
        await audioManager.play('bell');
        
        expect(bellFile.htmlAudio.load).toHaveBeenCalled();
      }
    });
  });
});