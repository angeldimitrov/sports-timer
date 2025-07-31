/**
 * Audio Manager for Boxing Timer
 * 
 * Provides robust audio system using Web Audio API for precise timing and reliable playback.
 * Handles bell sounds for round start/end, warning beeps, and volume control with fallback support.
 * 
 * Features:
 * - Web Audio API with fallback to HTML5 Audio
 * - Preloading and caching of audio files
 * - Volume control (0-100%) and mute functionality
 * - Multiple sound types (bell, beep, warning)
 * - Browser compatibility handling
 * - Precise audio timing synchronization
 */

// Audio types for different timer events
export type AudioType = 'bell' | 'beep' | 'warning' | 'roundStart' | 'roundEnd' | 'tenSecondWarning' | 'getReady' | 'rest' | 'workoutComplete' | 'greatJob';

// Audio file configuration
interface AudioFile {
  url: string;
  buffer?: AudioBuffer;
  htmlAudio?: HTMLAudioElement;
}

// Audio manager configuration
interface AudioManagerConfig {
  baseUrl?: string;
  enableFallback?: boolean;
  preloadAll?: boolean;
  enableSyntheticAudio?: boolean;
}

// Volume and mute state
interface AudioState {
  volume: number; // 0-100
  isMuted: boolean;
  isInitialized: boolean;
  hasWebAudioSupport: boolean;
  usingSyntheticAudio: boolean;
}

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private audioFiles: Map<AudioType, AudioFile> = new Map();
  private state: AudioState = {
    volume: 100,
    isMuted: false,
    isInitialized: false,
    hasWebAudioSupport: false,
    usingSyntheticAudio: false,
  };

  private config: AudioManagerConfig;

  /**
   * Initialize the Audio Manager
   * 
   * @param config Configuration options for audio manager
   */
  constructor(config: AudioManagerConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || '/sounds',
      enableFallback: config.enableFallback !== false,
      preloadAll: config.preloadAll !== false,
      enableSyntheticAudio: config.enableSyntheticAudio !== false,
    };

    // Define audio file mappings using generated voice files
    // Cache-busting timestamp to force reload of new audio files
    const cacheBuster = `?v=new-audio-${Date.now()}`;
    
    this.audioFiles.set('bell', { url: `${this.config.baseUrl}/bell.mp3${cacheBuster}` });
    this.audioFiles.set('beep', { url: `${this.config.baseUrl}/warning-beep.mp3${cacheBuster}` });
    this.audioFiles.set('warning', { url: `${this.config.baseUrl}/warning-beep.mp3${cacheBuster}` });
    
    // Voice announcement files - clear and consistent
    this.audioFiles.set('roundStart', { url: `${this.config.baseUrl}/round-starts.mp3${cacheBuster}` });
    this.audioFiles.set('roundEnd', { url: `${this.config.baseUrl}/end-of-the-round.mp3${cacheBuster}` });
    this.audioFiles.set('tenSecondWarning', { url: `${this.config.baseUrl}/ten-seconds.mp3${cacheBuster}` });
    this.audioFiles.set('getReady', { url: `${this.config.baseUrl}/get-ready.mp3${cacheBuster}` });
    this.audioFiles.set('rest', { url: `${this.config.baseUrl}/rest.mp3${cacheBuster}` });
    this.audioFiles.set('workoutComplete', { url: `${this.config.baseUrl}/workout-complete.mp3${cacheBuster}` });
    this.audioFiles.set('greatJob', { url: `${this.config.baseUrl}/great-job.mp3${cacheBuster}` });

    // Check Web Audio API support
    this.state.hasWebAudioSupport = this.checkWebAudioSupport();
  }

  /**
   * Check if Web Audio API is supported
   * 
   * @returns true if Web Audio API is available
   */
  private checkWebAudioSupport(): boolean {
    return !!(
      window.AudioContext ||
      (window as any).webkitAudioContext ||
      (window as any).mozAudioContext
    );
  }

  /**
   * Initialize the audio system
   * Must be called after user interaction due to browser autoplay policies
   * 
   * @returns Promise that resolves when initialization is complete
   */
  async initialize(): Promise<void> {
    if (this.state.isInitialized) {
      return;
    }

    try {
      if (this.state.hasWebAudioSupport) {
        await this.initializeWebAudio();
      }

      if (this.config.enableFallback) {
        await this.initializeFallback();
      }

      if (this.config.preloadAll) {
        await this.preloadAllAudio();
      }

      this.state.isInitialized = true;
    } catch (error) {
      console.warn('Audio initialization failed:', error);
      
      // If Web Audio fails, ensure fallback is available
      if (this.config.enableFallback && !this.hasFallbackAudio()) {
        await this.initializeFallback();
      }
      
      this.state.isInitialized = true;
    }
  }

  /**
   * Initialize Web Audio API context and gain node
   */
  private async initializeWebAudio(): Promise<void> {
    const AudioContext = window.AudioContext || 
                        (window as any).webkitAudioContext || 
                        (window as any).mozAudioContext;

    if (!AudioContext) {
      throw new Error('Web Audio API not supported');
    }

    this.audioContext = new AudioContext();
    
    // Resume context if suspended (required by some browsers)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // Create main gain node for volume control
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
    
    // Set initial volume
    this.updateGainValue();
  }

  /**
   * Initialize HTML5 Audio fallback
   */
  private async initializeFallback(): Promise<void> {
    for (const [type, audioFile] of this.audioFiles) {
      const audio = new Audio();
      audio.src = audioFile.url;
      audio.preload = 'auto';
      audio.volume = this.getVolumeDecimal();
      
      // Handle audio loading
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Timeout loading ${type} audio`));
        }, 5000);

        audio.addEventListener('canplaythrough', () => {
          clearTimeout(timeout);
          resolve();
        }, { once: true });

        audio.addEventListener('error', () => {
          clearTimeout(timeout);
          reject(new Error(`Failed to load ${type} audio`));
        }, { once: true });

        // Start loading
        audio.load();
      });

      audioFile.htmlAudio = audio;
    }
  }

  /**
   * Preload all audio files as Web Audio buffers
   */
  private async preloadAllAudio(): Promise<void> {
    if (!this.audioContext) {
      return;
    }

    const loadPromises = Array.from(this.audioFiles.entries()).map(
      async ([type, audioFile]) => {
        try {
          const response = await fetch(audioFile.url);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
          audioFile.buffer = audioBuffer;
        } catch (error) {
          console.warn(`Failed to preload ${type} audio:`, error);
        }
      }
    );

    await Promise.allSettled(loadPromises);
  }

  /**
   * Check if fallback audio is available
   */
  private hasFallbackAudio(): boolean {
    return Array.from(this.audioFiles.values()).some(file => file.htmlAudio);
  }

  /**
   * Generate synthetic audio tone using Web Audio API
   * Used as fallback when audio files are not available
   * 
   * @param type Type of audio to generate
   * @param when When to play the tone (in seconds)
   */
  private generateSyntheticTone(type: AudioType, when: number = 0): void {
    if (!this.audioContext || !this.gainNode) {
      throw new Error('Web Audio context not available for synthetic audio');
    }

    // Audio characteristics for each type
    const toneConfig: Record<string, any> = {
      bell: {
        frequency: 1000,
        duration: 1.2,
        type: 'sine' as OscillatorType,
        attack: 0.01,
        decay: 0.3,
        sustain: 0.7,
        release: 0.8,
      },
      beep: {
        frequency: 800,
        duration: 0.3,
        type: 'square' as OscillatorType,
        attack: 0.01,
        decay: 0.05,
        sustain: 0.8,
        release: 0.2,
      },
      warning: {
        frequency: 1200,
        duration: 0.8,
        type: 'sawtooth' as OscillatorType,
        attack: 0.02,
        decay: 0.1,
        sustain: 0.6,
        release: 0.3,
      },
      // Default fallback tone for voice announcements
      default: {
        frequency: 880,
        duration: 0.5,
        type: 'triangle' as OscillatorType,
        attack: 0.01,
        decay: 0.1,
        sustain: 0.8,
        release: 0.3,
      },
    };

    const config = toneConfig[type] || toneConfig.default;
    const startTime = this.audioContext.currentTime + when;

    // Create oscillator and envelope
    const oscillator = this.audioContext.createOscillator();
    const envelope = this.audioContext.createGain();

    // Connect nodes
    oscillator.connect(envelope);
    envelope.connect(this.gainNode);

    // Configure oscillator
    oscillator.frequency.setValueAtTime(config.frequency, startTime);
    oscillator.type = config.type;

    // Configure ADSR envelope
    envelope.gain.setValueAtTime(0, startTime);
    envelope.gain.linearRampToValueAtTime(0.3, startTime + config.attack);
    envelope.gain.exponentialRampToValueAtTime(0.3 * config.sustain, startTime + config.attack + config.decay);
    envelope.gain.setValueAtTime(0.3 * config.sustain, startTime + config.duration - config.release);
    envelope.gain.exponentialRampToValueAtTime(0.001, startTime + config.duration);

    // Special handling for warning tone (pulsing effect)
    if (type === 'warning') {
      const pulseFreq = 8; // 8 Hz pulse
      const lfo = this.audioContext.createOscillator();
      const lfoGain = this.audioContext.createGain();
      
      lfo.frequency.setValueAtTime(pulseFreq, startTime);
      lfo.type = 'square';
      lfoGain.gain.setValueAtTime(0.3, startTime);
      
      lfo.connect(lfoGain);
      lfoGain.connect(envelope.gain);
      
      lfo.start(startTime);
      lfo.stop(startTime + config.duration);
    }

    // Start and stop oscillator
    oscillator.start(startTime);
    oscillator.stop(startTime + config.duration);
  }

  /**
   * Play audio of specified type
   * 
   * @param type Type of audio to play
   * @param when When to play the audio (Web Audio API scheduling)
   * @returns Promise that resolves when playback starts
   */
  async play(type: AudioType, when: number = 0): Promise<void> {
    if (!this.state.isInitialized) {
      console.warn('Audio manager not initialized');
      return;
    }

    if (this.state.isMuted) {
      return;
    }

    const audioFile = this.audioFiles.get(type);
    if (!audioFile) {
      console.warn(`Audio type ${type} not found`);
      return;
    }

    try {
      // Try Web Audio API with loaded buffer first
      if (this.audioContext && this.gainNode && audioFile.buffer) {
        await this.playWebAudio(audioFile.buffer, when);
        return;
      }

      // Fallback to HTML5 Audio
      if (audioFile.htmlAudio) {
        await this.playHtmlAudio(audioFile.htmlAudio);
        return;
      }

      // Final fallback: Generate synthetic audio if enabled
      if (this.config.enableSyntheticAudio && this.audioContext && this.gainNode) {
        this.generateSyntheticTone(type, when);
        
        if (!this.state.usingSyntheticAudio) {
          this.state.usingSyntheticAudio = true;
          console.info('Using synthetic audio generation - audio files not available');
        }
        return;
      }

      console.warn(`No audio source available for ${type}`);
    } catch (error) {
      console.error(`Failed to play ${type} audio:`, error);
      
      // Last resort: try synthetic audio even if main playback failed
      if (this.config.enableSyntheticAudio && this.audioContext && this.gainNode) {
        try {
          this.generateSyntheticTone(type, when);
          this.state.usingSyntheticAudio = true;
        } catch (synthError) {
          console.error('Synthetic audio generation also failed:', synthError);
        }
      }
    }
  }

  /**
   * Play audio using Web Audio API
   * 
   * @param buffer Audio buffer to play
   * @param when When to start playback (in seconds)
   */
  private async playWebAudio(buffer: AudioBuffer, when: number): Promise<void> {
    if (!this.audioContext || !this.gainNode) {
      throw new Error('Web Audio context not available');
    }

    // Create buffer source node
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gainNode);

    // Calculate start time
    const startTime = when > 0 ? this.audioContext.currentTime + when : 0;
    
    // Start playback
    source.start(startTime);
  }

  /**
   * Play audio using HTML5 Audio element
   * 
   * @param audio HTML audio element to play
   */
  private async playHtmlAudio(audio: HTMLAudioElement): Promise<void> {
    // Reset to start and play
    audio.currentTime = 0;
    audio.volume = this.getVolumeDecimal();
    
    try {
      await audio.play();
    } catch (error) {
      // Handle autoplay restrictions
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        console.warn('Audio playback blocked by browser autoplay policy');
        throw error;
      }
      throw error;
    }
  }

  /**
   * Set volume level
   * 
   * @param volume Volume level (0-100)
   */
  setVolume(volume: number): void {
    // Clamp volume to valid range
    this.state.volume = Math.max(0, Math.min(100, volume));
    
    // Update Web Audio gain
    this.updateGainValue();
    
    // Update HTML5 Audio elements
    this.updateHtmlAudioVolume();
  }

  /**
   * Get current volume level
   * 
   * @returns Current volume (0-100)
   */
  getVolume(): number {
    return this.state.volume;
  }

  /**
   * Mute or unmute audio
   * 
   * @param muted Whether to mute audio
   */
  setMuted(muted: boolean): void {
    this.state.isMuted = muted;
    
    // Update gain node
    this.updateGainValue();
    
    // Update HTML5 Audio elements
    this.updateHtmlAudioVolume();
  }

  /**
   * Get mute state
   * 
   * @returns true if audio is muted
   */
  isMuted(): boolean {
    return this.state.isMuted;
  }

  /**
   * Toggle mute state
   * 
   * @returns New mute state
   */
  toggleMute(): boolean {
    this.setMuted(!this.state.isMuted);
    return this.state.isMuted;
  }

  /**
   * Play round start notification (bell + voice announcement)
   * 
   * @param when When to play the audio
   */
  async playRoundStart(when: number = 0): Promise<void> {
    // Play both bell and voice announcement
    await Promise.all([
      this.play('bell', when),
      this.play('roundStart', when)
    ]);
  }

  /**
   * Play round end notification (bell + voice announcement)
   * 
   * @param when When to play the audio
   */
  async playRoundEnd(when: number = 0): Promise<void> {
    // Play both bell and voice announcement
    await Promise.all([
      this.play('bell', when),
      this.play('roundEnd', when)
    ]);
  }

  /**
   * Play 10-second warning (voice announcement only)
   * 
   * @param when When to play the audio
   */
  async playTenSecondWarning(when: number = 0): Promise<void> {
    // Play only the voice announcement - no beep sound to avoid artifacts
    await this.play('tenSecondWarning', when);
  }

  /**
   * Play get ready announcement
   * 
   * @param when When to play the audio
   */
  async playGetReady(when: number = 0): Promise<void> {
    await this.play('getReady', when);
  }

  /**
   * Play rest announcement
   * 
   * @param when When to play the audio
   */
  async playRest(when: number = 0): Promise<void> {
    await this.play('rest', when);
  }

  /**
   * Play workout complete announcement
   * 
   * @param when When to play the audio
   */
  async playWorkoutComplete(when: number = 0): Promise<void> {
    await this.play('workoutComplete', when);
  }

  /**
   * Play great job announcement
   * 
   * @param when When to play the audio
   */
  async playGreatJob(when: number = 0): Promise<void> {
    await this.play('greatJob', when);
  }

  /**
   * Get current audio state
   * 
   * @returns Current audio state
   */
  getState(): Readonly<AudioState> {
    return { ...this.state };
  }

  /**
   * Check if audio system is ready for playback
   * 
   * @returns true if audio system is ready
   */
  isReady(): boolean {
    return this.state.isInitialized && (
      (this.audioContext && this.gainNode) || 
      this.hasFallbackAudio()
    );
  }

  /**
   * Update Web Audio gain node value
   */
  private updateGainValue(): void {
    if (this.gainNode) {
      const gain = this.state.isMuted ? 0 : this.getVolumeDecimal();
      this.gainNode.gain.setValueAtTime(gain, this.audioContext!.currentTime);
    }
  }

  /**
   * Update HTML5 Audio elements volume
   */
  private updateHtmlAudioVolume(): void {
    const volume = this.state.isMuted ? 0 : this.getVolumeDecimal();
    
    for (const audioFile of this.audioFiles.values()) {
      if (audioFile.htmlAudio) {
        audioFile.htmlAudio.volume = volume;
      }
    }
  }

  /**
   * Convert volume percentage to decimal
   * 
   * @returns Volume as decimal (0.0-1.0)
   */
  private getVolumeDecimal(): number {
    return this.state.volume / 100;
  }

  /**
   * Clean up audio resources
   */
  dispose(): void {
    // Close Web Audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.gainNode = null;
    }

    // Clean up HTML5 Audio elements
    for (const audioFile of this.audioFiles.values()) {
      if (audioFile.htmlAudio) {
        audioFile.htmlAudio.pause();
        audioFile.htmlAudio.src = '';
        audioFile.htmlAudio = undefined;
      }
      audioFile.buffer = undefined;
    }

    this.state.isInitialized = false;
  }
}

// Singleton instance for global use
let audioManagerInstance: AudioManager | null = null;

/**
 * Get or create the global AudioManager instance
 * 
 * @param config Configuration for new instance (ignored if instance exists)
 * @returns Global AudioManager instance
 */
export function getAudioManager(config?: AudioManagerConfig): AudioManager {
  if (!audioManagerInstance) {
    audioManagerInstance = new AudioManager(config);
  }
  return audioManagerInstance;
}

/**
 * Reset the global AudioManager instance
 * Useful for testing or reconfiguration
 */
export function resetAudioManager(): void {
  if (audioManagerInstance) {
    audioManagerInstance.dispose();
    audioManagerInstance = null;
  }
}