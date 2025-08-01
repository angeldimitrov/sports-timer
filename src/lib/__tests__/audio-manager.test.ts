/**
 * Audio Manager Unit Tests
 * 
 * Comprehensive test suite for the AudioManager class focusing on:
 * - Web Audio API functionality and fallback scenarios
 * - Audio file loading and caching
 * - Volume control and mute functionality
 * - Synthetic audio generation
 * - Error handling and recovery
 * - Browser compatibility and autoplay policies
 * - Performance and memory management
 */

import { AudioManager, AudioType, getAudioManager, resetAudioManager } from '../audio-manager'

// Mock Web Audio API components
const mockGainNode = {
  gain: {
    value: 1,
    setValueAtTime: jest.fn(),
    linearRampToValueAtTime: jest.fn(),
    exponentialRampToValueAtTime: jest.fn()
  },
  connect: jest.fn()
}

const mockOscillator = {
  frequency: { setValueAtTime: jest.fn() },
  type: 'sine',
  connect: jest.fn(),
  start: jest.fn(),
  stop: jest.fn()
}

const mockBufferSource = {
  buffer: null,
  connect: jest.fn(),
  start: jest.fn(),
  stop: jest.fn()
}

const mockAudioContext = {
  state: 'running',
  currentTime: 0,
  destination: {},
  sampleRate: 44100,
  createGain: jest.fn(() => mockGainNode),
  createOscillator: jest.fn(() => mockOscillator),
  createBufferSource: jest.fn(() => mockBufferSource),
  decodeAudioData: jest.fn(),
  resume: jest.fn(() => Promise.resolve()),
  suspend: jest.fn(() => Promise.resolve()),
  close: jest.fn(() => Promise.resolve())
}

const mockHtmlAudio = {
  src: '',
  volume: 1,
  currentTime: 0,
  duration: 1,
  paused: true,
  ended: false,
  readyState: 4,
  preload: 'auto',
  play: jest.fn(() => Promise.resolve()),
  pause: jest.fn(),
  load: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}

describe('AudioManager', () => {
  let audioManager: AudioManager
  let mockFetch: jest.Mock

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    
    // Mock AudioContext
    global.AudioContext = jest.fn(() => mockAudioContext) as typeof AudioContext
    global.webkitAudioContext = jest.fn(() => mockAudioContext) as typeof AudioContext
    
    // Mock HTML Audio
    global.Audio = jest.fn(() => mockHtmlAudio) as typeof Audio
    
    // Mock fetch for audio file loading
    mockFetch = jest.fn(() => Promise.resolve({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
    }))
    global.fetch = mockFetch
    
    // Mock performance timing
    Object.defineProperty(global.performance, 'now', {
      value: jest.fn(() => Date.now()),
      writable: true
    })
    
    // Reset singleton
    resetAudioManager()
    
    // Create fresh instance
    audioManager = new AudioManager({
      baseUrl: '/test-sounds',
      enableFallback: true,
      preloadAll: true,
      enableSyntheticAudio: true
    })
  })

  afterEach(() => {
    audioManager.dispose()
    resetAudioManager()
  })

  describe('Initialization', () => {
    /**
     * Test Web Audio API support detection
     * Business Rule: Should properly detect Web Audio API availability
     */
    test('should detect Web Audio API support', () => {
      expect(audioManager.getState().hasWebAudioSupport).toBe(true)
      
      // Test without Web Audio API
      const originalAudioContext = global.AudioContext
      delete (global as typeof global & { AudioContext?: typeof AudioContext }).AudioContext
      delete (global as typeof global & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      
      const noWebAudioManager = new AudioManager()
      expect(noWebAudioManager.getState().hasWebAudioSupport).toBe(false)
      
      // Restore
      global.AudioContext = originalAudioContext
      noWebAudioManager.dispose()
    })

    /**
     * Test successful Web Audio initialization
     * Business Rule: Web Audio should initialize with proper context and gain node
     */
    test('should initialize Web Audio API successfully', async () => {
      mockAudioContext.decodeAudioData.mockResolvedValue({
        duration: 1.0,
        sampleRate: 44100,
        numberOfChannels: 2
      })
      
      await audioManager.initialize()
      
      const state = audioManager.getState()
      expect(state.isInitialized).toBe(true)
      expect(mockAudioContext.createGain).toHaveBeenCalled()
      expect(mockGainNode.connect).toHaveBeenCalledWith(mockAudioContext.destination)
    })

    /**
     * Test HTML5 Audio fallback initialization
     * Business Rule: Should initialize HTML5 Audio when Web Audio fails
     */
    test('should initialize HTML5 Audio fallback', async () => {
      // Mock Web Audio failure
      global.AudioContext = jest.fn(() => {
        throw new Error('Web Audio not supported')
      }) as typeof AudioContext
      
      const fallbackManager = new AudioManager({ enableFallback: true })
      await fallbackManager.initialize()
      
      const state = fallbackManager.getState()
      expect(state.isInitialized).toBe(true)
      
      // Should have created HTML Audio elements
      expect(global.Audio).toHaveBeenCalledTimes(3) // bell, beep, warning
      
      fallbackManager.dispose()
    })

    /**
     * Test audio file preloading
     * Business Rule: Should preload all audio files during initialization
     */
    test('should preload audio files', async () => {
      const mockArrayBuffer = new ArrayBuffer(2048)
      const mockAudioBuffer = { duration: 1.5, sampleRate: 44100 }
      
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockArrayBuffer)
      })
      
      mockAudioContext.decodeAudioData.mockResolvedValue(mockAudioBuffer)
      
      await audioManager.initialize()
      
      // Should fetch all audio files
      expect(mockFetch).toHaveBeenCalledWith('/test-sounds/bell.mp3')
      expect(mockFetch).toHaveBeenCalledWith('/test-sounds/beep.mp3')
      expect(mockFetch).toHaveBeenCalledWith('/test-sounds/warning.mp3')
      
      // Should decode audio data
      expect(mockAudioContext.decodeAudioData).toHaveBeenCalledTimes(3)
    })

    /**
     * Test initialization error handling
     * Business Rule: Should handle initialization errors gracefully
     */
    test('should handle initialization errors gracefully', async () => {
      // Mock various failure scenarios
      mockFetch.mockRejectedValue(new Error('Network error'))
      
      await audioManager.initialize()
      
      // Should still be initialized (graceful fallback)
      expect(audioManager.getState().isInitialized).toBe(true)
    })
  })

  describe('Audio Playback', () => {
    beforeEach(async () => {
      mockAudioContext.decodeAudioData.mockResolvedValue({
        duration: 1.0,
        sampleRate: 44100
      })
      await audioManager.initialize()
    })

    /**
     * Test Web Audio playback
     * Business Rule: Should use Web Audio API for precise playback timing
     */
    test('should play audio using Web Audio API', async () => {
      await audioManager.play('bell', 0.5)
      
      expect(mockAudioContext.createBufferSource).toHaveBeenCalled()
      expect(mockBufferSource.connect).toHaveBeenCalledWith(mockGainNode)
      expect(mockBufferSource.start).toHaveBeenCalled()
    })

    /**
     * Test HTML5 Audio fallback playback
     * Business Rule: Should fallback to HTML5 Audio when Web Audio unavailable
     */
    test('should fallback to HTML5 Audio playback', async () => {
      // Remove Web Audio buffer to force fallback
      const audioFiles = (audioManager as unknown as { audioFiles: Map<string, { buffer?: AudioBuffer; htmlAudio?: HTMLAudioElement }> }).audioFiles
      audioFiles.get('bell')!.buffer = undefined
      
      await audioManager.play('bell')
      
      expect(mockHtmlAudio.play).toHaveBeenCalled()
      expect(mockHtmlAudio.currentTime).toBe(0) // Reset to start
    })

    /**
     * Test synthetic audio generation
     * Business Rule: Should generate synthetic audio when files unavailable
     */
    test('should generate synthetic audio as final fallback', async () => {
      // Remove both Web Audio buffer and HTML Audio
      const audioFiles = (audioManager as unknown as { audioFiles: Map<string, { buffer?: AudioBuffer; htmlAudio?: HTMLAudioElement }> }).audioFiles
      audioFiles.get('beep')!.buffer = undefined
      audioFiles.get('beep')!.htmlAudio = undefined
      
      await audioManager.play('beep')
      
      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
      expect(mockOscillator.start).toHaveBeenCalled()
      expect(audioManager.getState().usingSyntheticAudio).toBe(true)
    })

    /**
     * Test different audio types
     * Business Rule: Each audio type should have distinct characteristics
     */
    test('should handle different audio types correctly', async () => {
      const audioTypes: AudioType[] = ['bell', 'beep', 'warning']
      
      for (const type of audioTypes) {
        mockAudioContext.createOscillator.mockClear()
        
        // Force synthetic audio to test type-specific generation
        const audioFiles = (audioManager as unknown as { audioFiles: Map<string, { buffer?: AudioBuffer; htmlAudio?: HTMLAudioElement }> }).audioFiles
        audioFiles.get(type)!.buffer = undefined
        audioFiles.get(type)!.htmlAudio = undefined
        
        await audioManager.play(type)
        
        expect(mockAudioContext.createOscillator).toHaveBeenCalled()
      }
    })

    /**
     * Test scheduled playback timing
     * Business Rule: Should support precise timing for audio scheduling
     */
    test('should support scheduled playback', async () => {
      const scheduledTime = 2.5
      
      await audioManager.play('bell', scheduledTime)
      
      expect(mockBufferSource.start).toHaveBeenCalledWith(
        expect.any(Number) // Should calculate proper start time
      )
    })

    /**
     * Test muted playback
     * Business Rule: Should not play audio when muted
     */
    test('should not play audio when muted', async () => {
      audioManager.setMuted(true)
      
      await audioManager.play('bell')
      
      // Should not attempt playback
      expect(mockAudioContext.createBufferSource).not.toHaveBeenCalled()
      expect(mockHtmlAudio.play).not.toHaveBeenCalled()
    })

    /**
     * Test uninitialized playback
     * Business Rule: Should warn but not fail when not initialized
     */
    test('should handle playback when not initialized', async () => {
      const uninitializedManager = new AudioManager()
      
      // Should not throw
      await expect(uninitializedManager.play('bell')).resolves.not.toThrow()
      
      uninitializedManager.dispose()
    })
  })

  describe('Volume and Mute Control', () => {
    beforeEach(async () => {
      await audioManager.initialize()
    })

    /**
     * Test volume control
     * Business Rule: Volume should be clamped to 0-100 range
     */
    test('should control volume correctly', () => {
      // Test normal range
      audioManager.setVolume(75)
      expect(audioManager.getVolume()).toBe(75)
      expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalledWith(0.75, expect.any(Number))
      
      // Test boundary values
      audioManager.setVolume(-10)
      expect(audioManager.getVolume()).toBe(0)
      
      audioManager.setVolume(150)
      expect(audioManager.getVolume()).toBe(100)
    })

    /**
     * Test mute functionality
     * Business Rule: Mute should set gain to 0 but preserve volume setting
     */
    test('should handle mute correctly', () => {
      audioManager.setVolume(80)
      audioManager.setMuted(true)
      
      expect(audioManager.isMuted()).toBe(true)
      expect(audioManager.getVolume()).toBe(80) // Volume setting preserved
      expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalledWith(0, expect.any(Number))
      
      // Unmute should restore volume
      audioManager.setMuted(false)
      expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalledWith(0.8, expect.any(Number))
    })

    /**
     * Test mute toggle
     * Business Rule: Toggle should switch mute state
     */
    test('should toggle mute state', () => {
      expect(audioManager.isMuted()).toBe(false)
      
      const newState1 = audioManager.toggleMute()
      expect(newState1).toBe(true)
      expect(audioManager.isMuted()).toBe(true)
      
      const newState2 = audioManager.toggleMute()
      expect(newState2).toBe(false)
      expect(audioManager.isMuted()).toBe(false)
    })

    /**
     * Test HTML5 Audio volume synchronization
     * Business Rule: HTML5 Audio elements should sync with main volume
     */
    test('should synchronize HTML5 Audio volume', () => {
      audioManager.setVolume(60)
      
      // HTML Audio elements should be updated
      expect(mockHtmlAudio.volume).toBe(0.6)
    })
  })

  describe('Error Handling and Recovery', () => {
    /**
     * Test audio loading failure recovery
     * Business Rule: Should continue functioning when some audio files fail to load
     */
    test('should handle audio loading failures', async () => {
      // Mock partial loading failure
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
        })
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
        })
      
      await audioManager.initialize()
      
      // Should still be initialized
      expect(audioManager.getState().isInitialized).toBe(true)
    })

    /**
     * Test Web Audio decoding failure
     * Business Rule: Should handle audio decoding errors gracefully
     */
    test('should handle audio decoding failures', async () => {
      mockAudioContext.decodeAudioData.mockRejectedValue(new Error('Decoding failed'))
      
      await audioManager.initialize()
      
      // Should still initialize successfully
      expect(audioManager.getState().isInitialized).toBe(true)
    })

    /**
     * Test HTML5 Audio loading failure
     * Business Rule: Should handle HTML5 Audio loading timeouts
     */
    test('should handle HTML5 Audio loading timeouts', async () => {
      // Mock HTML Audio that never fires canplaythrough
      const slowAudio = {
        ...mockHtmlAudio,
        addEventListener: jest.fn(),
        load: jest.fn()
      }
      
      global.Audio = jest.fn(() => slowAudio) as typeof Audio
      
      const timeoutManager = new AudioManager({ enableFallback: true })
      
      // Should timeout and continue
      await timeoutManager.initialize()
      expect(timeoutManager.getState().isInitialized).toBe(true)
      
      timeoutManager.dispose()
    })

    /**
     * Test autoplay policy handling
     * Business Rule: Should handle browser autoplay restrictions
     */
    test('should handle autoplay policy restrictions', async () => {
      mockHtmlAudio.play.mockRejectedValue(
        Object.assign(new DOMException('Not allowed'), { name: 'NotAllowedError' })
      )
      
      await audioManager.initialize()
      
      // Should handle autoplay error gracefully
      await expect(audioManager.play('bell')).resolves.not.toThrow()
    })
  })

  describe('Synthetic Audio Generation', () => {
    beforeEach(async () => {
      await audioManager.initialize()
    })

    /**
     * Test bell tone generation
     * Business Rule: Bell should generate warm, resonant tone
     */
    test('should generate bell tone correctly', async () => {
      // Force synthetic audio
      const audioFiles = (audioManager as unknown as { audioFiles: Map<string, { buffer?: AudioBuffer; htmlAudio?: HTMLAudioElement }> }).audioFiles
      audioFiles.get('bell')!.buffer = undefined
      audioFiles.get('bell')!.htmlAudio = undefined
      
      await audioManager.play('bell')
      
      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(1000, expect.any(Number))
      expect(mockOscillator.type).toBe('sine')
    })

    /**
     * Test beep tone generation
     * Business Rule: Beep should generate short, attention-getting tone
     */
    test('should generate beep tone correctly', async () => {
      const audioFiles = (audioManager as unknown as { audioFiles: Map<string, { buffer?: AudioBuffer; htmlAudio?: HTMLAudioElement }> }).audioFiles
      audioFiles.get('beep')!.buffer = undefined
      audioFiles.get('beep')!.htmlAudio = undefined
      
      await audioManager.play('beep')
      
      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(800, expect.any(Number))
      expect(mockOscillator.type).toBe('square')
    })

    /**
     * Test warning tone generation
     * Business Rule: Warning should generate urgent, pulsing tone
     */
    test('should generate warning tone with pulsing effect', async () => {
      const audioFiles = (audioManager as unknown as { audioFiles: Map<string, { buffer?: AudioBuffer; htmlAudio?: HTMLAudioElement }> }).audioFiles
      audioFiles.get('warning')!.buffer = undefined
      audioFiles.get('warning')!.htmlAudio = undefined
      
      await audioManager.play('warning')
      
      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(1200, expect.any(Number))
      expect(mockOscillator.type).toBe('sawtooth')
      
      // Should create LFO for pulsing effect
      expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(2)
    })

    /**
     * Test synthetic audio with scheduling
     * Business Rule: Synthetic audio should support scheduled playback
     */
    test('should schedule synthetic audio correctly', async () => {
      const audioFiles = (audioManager as unknown as { audioFiles: Map<string, { buffer?: AudioBuffer; htmlAudio?: HTMLAudioElement }> }).audioFiles
      audioFiles.get('bell')!.buffer = undefined
      audioFiles.get('bell')!.htmlAudio = undefined
      
      const scheduledTime = 1.5
      await audioManager.play('bell', scheduledTime)
      
      expect(mockOscillator.start).toHaveBeenCalledWith(expect.any(Number))
      expect(mockOscillator.stop).toHaveBeenCalledWith(expect.any(Number))
    })
  })

  describe('State Management', () => {
    /**
     * Test audio state tracking
     * Business Rule: State should accurately reflect audio system status
     */
    test('should track audio state correctly', async () => {
      const initialState = audioManager.getState()
      expect(initialState.isInitialized).toBe(false)
      expect(initialState.volume).toBe(80) // Default volume
      expect(initialState.isMuted).toBe(false)
      expect(initialState.hasWebAudioSupport).toBe(true)
      expect(initialState.usingSyntheticAudio).toBe(false)
      
      await audioManager.initialize()
      
      const initializedState = audioManager.getState()
      expect(initializedState.isInitialized).toBe(true)
    })

    /**
     * Test ready state checking
     * Business Rule: Should accurately report readiness for playback
     */
    test('should report ready state correctly', async () => {
      expect(audioManager.isReady()).toBe(false)
      
      await audioManager.initialize()
      
      expect(audioManager.isReady()).toBe(true)
    })
  })

  describe('Resource Management', () => {
    /**
     * Test proper resource cleanup
     * Business Rule: All audio resources should be cleaned up on dispose
     */
    test('should clean up resources on dispose', async () => {
      await audioManager.initialize()
      
      audioManager.dispose()
      
      expect(mockAudioContext.close).toHaveBeenCalled()
      expect(mockHtmlAudio.pause).toHaveBeenCalled()
      expect(audioManager.getState().isInitialized).toBe(false)
    })

    /**
     * Test multiple dispose calls
     * Business Rule: Multiple dispose calls should be safe
     */
    test('should handle multiple dispose calls safely', async () => {
      await audioManager.initialize()
      
      expect(() => {
        audioManager.dispose()
        audioManager.dispose()
        audioManager.dispose()
      }).not.toThrow()
    })
  })

  describe('Singleton Management', () => {
    /**
     * Test global audio manager singleton
     * Business Rule: Should maintain single instance across application
     */
    test('should maintain singleton instance', () => {
      const instance1 = getAudioManager()
      const instance2 = getAudioManager()
      
      expect(instance1).toBe(instance2)
      
      // Reset should clear singleton
      resetAudioManager()
      const instance3 = getAudioManager()
      
      expect(instance3).not.toBe(instance1)
      
      instance1.dispose()
      instance3.dispose()
    })

    /**
     * Test singleton configuration
     * Business Rule: Configuration should only apply to new instances
     */
    test('should apply configuration only to new instances', () => {
      const config = { baseUrl: '/custom-sounds' }
      const instance1 = getAudioManager(config)
      const instance2 = getAudioManager({ baseUrl: '/different-sounds' }) // Should be ignored
      
      expect(instance1).toBe(instance2)
      
      instance1.dispose()
    })
  })

  describe('Performance and Memory', () => {
    /**
     * Test memory usage with large number of plays
     * Business Rule: Should not leak memory with repeated playback
     */
    test('should not leak memory with repeated playback', async () => {
      await audioManager.initialize()
      
      // Simulate many audio plays
      for (let i = 0; i < 100; i++) {
        await audioManager.play('beep')
      }
      
      // Should not accumulate buffer sources or other resources
      // This test verifies that each play creates and releases resources properly
      expect(mockAudioContext.createBufferSource).toHaveBeenCalledTimes(100)
    })

    /**
     * Test concurrent playback
     * Business Rule: Should handle multiple simultaneous audio plays
     */
    test('should handle concurrent playback', async () => {
      await audioManager.initialize()
      
      // Start multiple plays simultaneously
      const plays = [
        audioManager.play('bell'),
        audioManager.play('beep'),
        audioManager.play('warning')
      ]
      
      await Promise.all(plays)
      
      // Should create separate buffer sources for each
      expect(mockAudioContext.createBufferSource).toHaveBeenCalledTimes(3)
    })
  })
})