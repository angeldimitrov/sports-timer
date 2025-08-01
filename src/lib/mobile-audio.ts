/**
 * Mobile Audio Manager for Boxing Timer
 * 
 * Specialized audio handling for mobile devices with browser-specific optimizations.
 * Addresses mobile browser limitations including autoplay policies, background throttling,
 * and iOS Safari audio restrictions.
 * 
 * Features:
 * - Mobile browser autoplay policy handling
 * - iOS Safari audio unlock and optimization
 * - Background audio continuation strategies
 * - Low-latency audio playback for precise timing
 * - Battery-conscious audio management
 * - Progressive Web App audio integration
 */

import { createModuleLogger } from './logger';

// Initialize module logger
const log = createModuleLogger('MobileAudio');

// Re-export base audio types
export type { AudioType } from './audio-manager';

// Mobile-specific audio configuration
interface MobileAudioConfig {
  /** Enable iOS Safari audio unlock */
  enableIosUnlock: boolean;
  /** Use AudioContext for low-latency playback */
  useLowLatency: boolean;
  /** Preload strategy for mobile networks */
  mobilePreloadStrategy: 'aggressive' | 'conservative' | 'on-demand';
  /** Enable background audio continuation */
  enableBackgroundAudio: boolean;
  /** Autoplay policy handling */
  autoplayHandling: 'strict' | 'permissive' | 'user-gesture';
  /** Audio buffer size for mobile optimization */
  bufferSize: number;
  /** Enable audio worklet for precision timing */
  useAudioWorklet: boolean;
}

// Mobile audio state tracking
interface MobileAudioState {
  isUnlocked: boolean;
  hasUserGesture: boolean;
  autoplayPolicy: 'blocked' | 'allowed' | 'unknown';
  backgroundAudioSupported: boolean;
  isBackgrounded: boolean;
  networkType: 'slow-2g' | '2g' | '3g' | '4g' | 'wifi' | 'unknown';
  batteryLevel?: number;
  isLowPowerMode: boolean;
}

// Browser detection results
interface BrowserInfo {
  isIos: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  version: number;
  supportsWebAudio: boolean;
  supportsAudioWorklet: boolean;
}

/**
 * Mobile Audio Manager
 * 
 * Extends the base audio manager with mobile-specific optimizations and workarounds.
 * Handles the complexities of mobile browser audio policies and limitations.
 */
export class MobileAudioManager {
  private audioContext: AudioContext | null = null;
  private unlockButton: HTMLButtonElement | null = null;
  private state: MobileAudioState;
  private config: MobileAudioConfig;
  private browserInfo: BrowserInfo;
  private visibilityHandler: (() => void) | null = null;
  private networkHandler: ((event?: Event) => void) | null = null;
  private batteryHandler: (() => void) | null = null;

  constructor(config: Partial<MobileAudioConfig> = {}) {
    this.config = {
      enableIosUnlock: true,
      useLowLatency: true,
      mobilePreloadStrategy: 'conservative',
      enableBackgroundAudio: true,
      autoplayHandling: 'user-gesture',
      bufferSize: 256,
      useAudioWorklet: false, // Disabled by default due to limited support
      ...config
    };

    this.browserInfo = this.detectBrowser();
    this.state = this.createInitialState();
    
    this.setupMobileOptimizations();
  }

  /**
   * Detect mobile browser and capabilities
   */
  private detectBrowser(): BrowserInfo {
    const userAgent = navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    const isChrome = /Chrome/.test(userAgent);
    const isFirefox = /Firefox/.test(userAgent);

    // Extract version numbers (simplified)
    let version = 0;
    if (isSafari) {
      const match = userAgent.match(/Version\/(\d+)/);
      version = match ? parseInt(match[1]) : 0;
    } else if (isChrome) {
      const match = userAgent.match(/Chrome\/(\d+)/);
      version = match ? parseInt(match[1]) : 0;
    }

    return {
      isIos,
      isSafari,
      isChrome,
      isFirefox,
      version,
      supportsWebAudio: !!(window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext),
      supportsAudioWorklet: !!(window.AudioContext && AudioContext.prototype.audioWorklet)
    };
  }

  /**
   * Create initial mobile audio state
   */
  private createInitialState(): MobileAudioState {
    return {
      isUnlocked: false,
      hasUserGesture: false,
      autoplayPolicy: 'unknown',
      backgroundAudioSupported: !this.browserInfo.isIos, // iOS has stricter background policies
      isBackgrounded: document.hidden,
      networkType: this.detectNetworkType(),
      batteryLevel: undefined,
      isLowPowerMode: false
    };
  }

  /**
   * Detect network connection type for optimization
   */
  private detectNetworkType(): MobileAudioState['networkType'] {
    if ('connection' in navigator) {
      const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
      const effectiveType = connection?.effectiveType;
      if (effectiveType && ['slow-2g', '2g', '3g', '4g', 'wifi'].includes(effectiveType)) {
        return effectiveType as MobileAudioState['networkType'];
      }
    }
    return 'unknown';
  }

  /**
   * Setup mobile-specific optimizations
   */
  private setupMobileOptimizations(): void {
    this.setupVisibilityHandling();
    this.setupNetworkHandling();
    this.setupBatteryHandling();
    this.setupAutoplayDetection();
    
    if (this.config.enableIosUnlock && this.browserInfo.isIos) {
      this.setupIosAudioUnlock();
    }
  }

  /**
   * Setup iOS Safari audio unlock mechanism
   */
  private setupIosAudioUnlock(): void {
    // Create invisible unlock button for iOS
    this.unlockButton = document.createElement('button');
    this.unlockButton.style.position = 'fixed';
    this.unlockButton.style.top = '-9999px';
    this.unlockButton.style.left = '-9999px';
    this.unlockButton.style.opacity = '0';
    this.unlockButton.style.pointerEvents = 'none';
    this.unlockButton.setAttribute('aria-hidden', 'true');
    
    document.body.appendChild(this.unlockButton);

    // Setup unlock trigger
    const unlockAudio = async () => {
      if (this.state.isUnlocked) return;

      try {
        // Create minimal audio context
        if (!this.audioContext) {
          this.audioContext = new (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!)();
        }

        // Create and play silent buffer to unlock
        const buffer = this.audioContext.createBuffer(1, 1, 22050);
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);
        source.start(0);

        await this.audioContext.resume();
        
        this.state.isUnlocked = true;
        this.state.hasUserGesture = true;
        
        log.debug('iOS audio unlocked');
        
        // Remove unlock button
        if (this.unlockButton && this.unlockButton.parentNode) {
          this.unlockButton.parentNode.removeChild(this.unlockButton);
        }
        
        // Remove event listeners
        document.removeEventListener('touchstart', unlockAudio);
        document.removeEventListener('click', unlockAudio);
        
      } catch (error) {
        log.warn('iOS unlock failed:', error);
      }
    };

    // Listen for first user interaction
    document.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
    document.addEventListener('click', unlockAudio, { once: true, passive: true });
  }

  /**
   * Setup document visibility handling for background audio
   */
  private setupVisibilityHandling(): void {
    this.visibilityHandler = () => {
      this.state.isBackgrounded = document.hidden;
      
      if (document.hidden) {
        log.debug('App backgrounded - preparing for restrictions');
        this.handleBackgroundTransition();
      } else {
        log.debug('App foregrounded - restoring audio');
        this.handleForegroundTransition();
      }
    };

    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  /**
   * Handle app going to background
   */
  private handleBackgroundTransition(): void {
    if (!this.config.enableBackgroundAudio) {
      return;
    }

    // Keep audio context running if possible
    if (this.audioContext && this.audioContext.state === 'running') {
      // Create a silent buffer to keep context alive
      try {
        const buffer = this.audioContext.createBuffer(1, 1, this.audioContext.sampleRate);
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);
        source.start();
      } catch (error) {
        log.warn('Background audio keepalive failed:', error);
      }
    }
  }

  /**
   * Handle app returning to foreground
   */
  private handleForegroundTransition(): void {
    // Resume audio context if suspended
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(error => {
        log.warn('Failed to resume audio context:', error);
      });
    }

    // Re-check autoplay policy
    this.checkAutoplayPolicy();
  }

  /**
   * Setup network connection monitoring
   */
  private setupNetworkHandling(): void {
    if ('connection' in navigator) {
      this.networkHandler = (_event?: Event) => {
        const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
        const oldType = this.state.networkType;
        const effectiveType = connection?.effectiveType;
        this.state.networkType = (effectiveType && ['slow-2g', '2g', '3g', '4g', 'wifi'].includes(effectiveType)) 
          ? effectiveType as MobileAudioState['networkType'] 
          : 'unknown';
        
        if (oldType !== this.state.networkType) {
          log.debug(`Network changed: ${oldType} -> ${this.state.networkType}`);
          this.adaptToNetworkConditions();
        }
      };

      const connection = (navigator as Navigator & { connection?: { addEventListener?: (event: string, handler: (event?: Event) => void) => void } }).connection;
      connection?.addEventListener?.('change', this.networkHandler);
    }
  }

  /**
   * Setup battery monitoring for power optimization
   */
  private setupBatteryHandling(): void {
    if ('getBattery' in navigator) {
      (navigator as Navigator & { getBattery?: () => Promise<{ level: number; addEventListener: (event: string, handler: () => void) => void }> }).getBattery?.().then((battery) => {
        this.state.batteryLevel = battery.level;
        this.state.isLowPowerMode = battery.level < 0.2;

        this.batteryHandler = () => {
          this.state.batteryLevel = battery.level;
          const wasLowPower = this.state.isLowPowerMode;
          this.state.isLowPowerMode = battery.level < 0.2;
          
          if (!wasLowPower && this.state.isLowPowerMode) {
            log.debug('Entering low power mode');
            this.optimizeForLowPower();
          } else if (wasLowPower && !this.state.isLowPowerMode) {
            log.debug('Exiting low power mode');
            this.restoreNormalPower();
          }
        };

        battery.addEventListener('levelchange', this.batteryHandler);
      }).catch((error: Error) => {
        log.warn('Battery API not available:', error);
      });
    }
  }

  /**
   * Detect autoplay policy
   */
  private setupAutoplayDetection(): void {
    this.checkAutoplayPolicy();
  }

  /**
   * Check current autoplay policy
   */
  private async checkAutoplayPolicy(): Promise<void> {
    if (!this.audioContext) {
      return;
    }

    try {
      // Test autoplay with a silent buffer
      const buffer = this.audioContext.createBuffer(1, 1, this.audioContext.sampleRate);
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start();

      await this.audioContext.resume();
      
      this.state.autoplayPolicy = 'allowed';
      log.debug('Autoplay policy: allowed');
    } catch {
      this.state.autoplayPolicy = 'blocked';
      log.debug('Autoplay policy: blocked');
    }
  }

  /**
   * Adapt audio strategy based on network conditions
   */
  private adaptToNetworkConditions(): void {
    const { networkType } = this.state;
    
    switch (networkType) {
      case 'slow-2g':
      case '2g':
        // Ultra-conservative for slow networks
        this.config.mobilePreloadStrategy = 'on-demand';
        log.debug('Adapted for slow network');
        break;
        
      case '3g':
        // Conservative preloading
        this.config.mobilePreloadStrategy = 'conservative';
        break;
        
      case '4g':
      case 'wifi':
        // Aggressive preloading for fast networks
        this.config.mobilePreloadStrategy = 'aggressive';
        break;
    }
  }

  /**
   * Optimize audio for low power mode
   */
  private optimizeForLowPower(): void {
    // Reduce audio processing complexity
    this.config.useLowLatency = false;
    this.config.bufferSize = 1024; // Larger buffer for efficiency
    
    // Switch to on-demand loading
    this.config.mobilePreloadStrategy = 'on-demand';
  }

  /**
   * Restore normal power audio settings
   */
  private restoreNormalPower(): void {
    // Restore original settings
    this.config.useLowLatency = true;
    this.config.bufferSize = 256;
    this.config.mobilePreloadStrategy = 'conservative';
  }

  /**
   * Create optimized audio context for mobile
   */
  async createMobileAudioContext(): Promise<AudioContext> {
    if (this.audioContext) {
      return this.audioContext;
    }

    // Wait for user gesture if required
    if (!this.state.hasUserGesture && this.config.autoplayHandling === 'user-gesture') {
      await this.waitForUserGesture();
    }

    const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    
    const contextOptions: AudioContextOptions = {
      latencyHint: this.config.useLowLatency ? 'interactive' : 'balanced',
      sampleRate: this.browserInfo.isIos ? 44100 : undefined // iOS prefers 44.1kHz
    };

    this.audioContext = new AudioContextClass(contextOptions);

    // Handle context state changes
    this.audioContext.addEventListener('statechange', () => {
      log.debug('Context state:', this.audioContext?.state);
    });

    return this.audioContext;
  }

  /**
   * Wait for user gesture before audio operations
   */
  private waitForUserGesture(): Promise<void> {
    if (this.state.hasUserGesture) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      const handleUserGesture = () => {
        this.state.hasUserGesture = true;
        document.removeEventListener('touchstart', handleUserGesture);
        document.removeEventListener('click', handleUserGesture);
        resolve();
      };

      document.addEventListener('touchstart', handleUserGesture, { once: true, passive: true });
      document.addEventListener('click', handleUserGesture, { once: true, passive: true });
    });
  }

  /**
   * Play audio with mobile optimizations
   */
  async playMobileOptimized(audioBuffer: AudioBuffer, when: number = 0): Promise<void> {
    const context = await this.createMobileAudioContext();

    // Ensure context is running
    if (context.state === 'suspended') {
      await context.resume();
    }

    // Create and configure source
    const source = context.createBufferSource();
    source.buffer = audioBuffer;

    // Apply mobile-specific optimizations
    if (this.config.useLowLatency) {
      // Direct connection for lowest latency
      source.connect(context.destination);
    } else {
      // Add gain node for better control
      const gainNode = context.createGain();
      gainNode.gain.value = this.state.isLowPowerMode ? 0.8 : 1.0;
      source.connect(gainNode);
      gainNode.connect(context.destination);
    }

    // Calculate start time
    const startTime = when > 0 ? context.currentTime + when : 0;
    
    // Start playback
    source.start(startTime);

    // Handle iOS Safari audio session
    if (this.browserInfo.isIos && this.browserInfo.isSafari) {
      this.handleIosAudioSession();
    }
  }

  /**
   * Handle iOS Safari audio session management
   */
  private handleIosAudioSession(): void {
    // Keep the audio session active
    if (this.audioContext && this.audioContext.state === 'running') {
      // Schedule a silent buffer to maintain session
      setTimeout(() => {
        if (this.audioContext && this.audioContext.state === 'running') {
          const buffer = this.audioContext.createBuffer(1, 1, this.audioContext.sampleRate);
          const source = this.audioContext.createBufferSource();
          source.buffer = buffer;
          source.connect(this.audioContext.destination);
          source.start();
        }
      }, 29000); // Every 29 seconds to stay under 30s limit
    }
  }

  /**
   * Get mobile audio capabilities and state
   */
  getState(): Readonly<MobileAudioState & BrowserInfo & MobileAudioConfig> {
    return {
      ...this.state,
      ...this.browserInfo,
      ...this.config
    };
  }

  /**
   * Cleanup mobile audio resources
   */
  dispose(): void {
    // Remove event listeners
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }

    if (this.networkHandler && 'connection' in navigator) {
      const connection = (navigator as Navigator & { connection?: { removeEventListener?: (event: string, handler: () => void) => void } }).connection;
      connection?.removeEventListener?.('change', this.networkHandler);
    }

    if (this.batteryHandler && 'getBattery' in navigator) {
      (navigator as Navigator & { getBattery?: () => Promise<{ removeEventListener: (event: string, handler: () => void) => void }> }).getBattery?.().then((battery) => {
        battery.removeEventListener('levelchange', this.batteryHandler!);
      });
    }

    // Clean up unlock button
    if (this.unlockButton && this.unlockButton.parentNode) {
      this.unlockButton.parentNode.removeChild(this.unlockButton);
    }

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

// Singleton instance for global use
let mobileAudioManagerInstance: MobileAudioManager | null = null;

/**
 * Get or create the global MobileAudioManager instance
 */
export function getMobileAudioManager(config?: Partial<MobileAudioConfig>): MobileAudioManager {
  if (!mobileAudioManagerInstance) {
    mobileAudioManagerInstance = new MobileAudioManager(config);
  }
  return mobileAudioManagerInstance;
}

/**
 * Reset the global MobileAudioManager instance
 */
export function resetMobileAudioManager(): void {
  if (mobileAudioManagerInstance) {
    mobileAudioManagerInstance.dispose();
    mobileAudioManagerInstance = null;
  }
}

/**
 * Check if current device is mobile
 */
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Get mobile audio recommendations based on device capabilities
 */
export function getMobileAudioRecommendations(): {
  shouldUseWebAudio: boolean;
  recommendedBufferSize: number;
  shouldPreloadAudio: boolean;
  requiresUserGesture: boolean;
} {
  const userAgent = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(userAgent);
  const isOldAndroid = /Android [1-4]/.test(userAgent);
  
  return {
    shouldUseWebAudio: !isOldAndroid,
    recommendedBufferSize: isIos ? 256 : 512,
    shouldPreloadAudio: !isIos, // iOS has memory restrictions
    requiresUserGesture: true // Most mobile browsers require user gesture
  };
}