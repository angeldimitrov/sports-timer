/**
 * Boxing Timer Engine
 * 
 * Core timer logic for the Boxing Timer MVP using Web Workers for ±100ms precision.
 * Manages round timing, rest periods, and workout state with reliable accuracy.
 * 
 * Business Context:
 * - Provides precise timing for boxing workouts with configurable rounds and rest periods
 * - Handles browser tab visibility changes and background execution
 * - Maintains accurate timing even under high CPU load using Web Worker isolation
 * - Supports round timer (1-10 minutes) with rest periods (15 seconds - 5 minutes)
 * - Round counter (1-20 rounds) with automatic progression
 */

// Type definitions for timer state and events
export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';
export type TimerPhase = 'preparation' | 'work' | 'rest';

export interface TimerConfig {
  /** Work period duration in seconds (60-600 seconds) */
  workDuration: number;
  /** Rest period duration in seconds (15-300 seconds) */
  restDuration: number;
  /** Total number of rounds (1-20) */
  totalRounds: number;
  /** Whether to include a 10-second warning before period ends */
  enableWarning: boolean;
  /** Preparation period duration in seconds (0-60 seconds, default 10) */
  prepDuration?: number;
}

export interface TimerState {
  /** Current timer status */
  status: TimerStatus;
  /** Current phase (work or rest) */
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

export interface TimerEvent {
  type: 'tick' | 'phaseChange' | 'roundComplete' | 'workoutComplete' | 'warning' | 'error' | 'preparationStart';
  state: TimerState;
  payload?: any;
}

export type TimerEventHandler = (event: TimerEvent) => void;

/**
 * Boxing Timer Engine with Web Worker precision timing
 * 
 * Features:
 * - High-precision timing using Web Workers (±100ms accuracy)
 * - Automatic round and rest period management
 * - Event-driven architecture for UI updates
 * - Proper cleanup and resource management
 * - Browser tab visibility handling
 * - Background execution support
 */
export class TimerEngine {
  private worker: Worker | null = null;
  private config: TimerConfig;
  private state: TimerState;
  private eventHandlers: Set<TimerEventHandler> = new Set();
  
  // Phase management
  private currentPhaseDuration: number = 0;
  private phaseStartTime: number = 0;
  
  // Browser visibility handling
  private isDocumentVisible = true;
  private visibilityChangeListener: (() => void) | null = null;

  constructor(config: TimerConfig) {
    this.config = { ...config };
    this.state = this.createInitialState();
    this.initializeWorker();
    this.setupVisibilityHandling();
    this.setupMobileBackgroundHandling();
  }

  /**
   * Create initial timer state
   */
  private createInitialState(): TimerState {
    const prepDuration = this.config.prepDuration || 0;
    return {
      status: 'idle',
      phase: prepDuration > 0 ? 'preparation' : 'work',
      currentRound: 1,
      timeRemaining: prepDuration > 0 ? prepDuration * 1000 : this.config.workDuration * 1000,
      timeElapsed: 0,
      progress: 0,
      warningTriggered: false,
      workoutProgress: 0
    };
  }

  /**
   * Initialize Web Worker for precise timing
   */
  private initializeWorker(): void {
    try {
      // Create worker from the public workers directory
      this.worker = new Worker('/workers/timer-worker.js');
      
      this.worker.onmessage = (e) => {
        this.handleWorkerMessage(e.data);
      };

      this.worker.onerror = (error) => {
        console.error('Timer Worker Error:', error);
        this.emitEvent({
          type: 'error',
          state: this.state,
          payload: { message: 'Timer worker error', error }
        });
      };

    } catch (error) {
      console.error('Failed to initialize timer worker:', error);
      this.emitEvent({
        type: 'error',
        state: this.state,
        payload: { message: 'Failed to initialize timer worker', error }
      });
    }
  }

  /**
   * Handle messages from Web Worker
   */
  private handleWorkerMessage(data: any): void {
    const { type, remaining, elapsed, progress } = data;

    switch (type) {
      case 'ready':
        console.log('Timer worker ready');
        break;

      case 'tick':
        this.updateTimerState(remaining, elapsed, progress);
        break;

      case 'completed':
        this.handlePhaseComplete();
        break;

      case 'paused':
        this.state.status = 'paused';
        this.emitEvent({ type: 'tick', state: this.state });
        break;

      case 'stopped':
        this.state.status = 'idle';
        this.emitEvent({ type: 'tick', state: this.state });
        break;

      case 'error':
        console.error('Timer worker error:', data.message);
        this.emitEvent({
          type: 'error',
          state: this.state,
          payload: data
        });
        break;

      default:
        console.warn('[TimerEngine] Unknown message type from worker:', type);
    }
  }

  /**
   * Update timer state from worker tick
   */
  private updateTimerState(remaining: number, elapsed: number, progress: number): void {
    this.state.timeRemaining = Math.max(0, remaining);
    this.state.timeElapsed = elapsed;
    this.state.progress = Math.min(1, progress);

    // Calculate overall workout progress
    const completedRounds = this.state.currentRound - 1;
    const totalPeriods = this.config.totalRounds * 2; // work + rest for each round
    const currentPeriodIndex = completedRounds * 2 + (this.state.phase === 'rest' ? 1 : 0);
    const currentPeriodProgress = this.state.progress;
    
    this.state.workoutProgress = Math.min(1, (currentPeriodIndex + currentPeriodProgress) / totalPeriods);

    // Handle 10-second warning
    if (this.config.enableWarning && !this.state.warningTriggered && remaining <= 10000 && remaining > 0) {
      this.state.warningTriggered = true;
      this.emitEvent({
        type: 'warning',
        state: this.state,
        payload: { 
          secondsRemaining: Math.ceil(remaining / 1000),
          phase: this.state.phase 
        }
      });
    }

    // Emit tick event
    this.emitEvent({ type: 'tick', state: this.state });
  }

  /**
   * Handle completion of current phase (preparation, work or rest)
   */
  private handlePhaseComplete(): void {
    if (this.state.phase === 'preparation') {
      // Preparation period completed - switch to work
      this.state.phase = 'work';
      this.state.timeRemaining = this.config.workDuration * 1000;
      this.state.warningTriggered = false;
      this.currentPhaseDuration = this.config.workDuration * 1000;
      
      this.emitEvent({
        type: 'phaseChange',
        state: this.state,
        payload: { newPhase: 'work', round: this.state.currentRound }
      });

      // Start work period
      this.startWorkerTimer(this.currentPhaseDuration);
      
    } else if (this.state.phase === 'work') {
      // Work period completed - switch to rest
      this.state.phase = 'rest';
      this.state.timeRemaining = this.config.restDuration * 1000;
      this.state.warningTriggered = false;
      this.currentPhaseDuration = this.config.restDuration * 1000;
      
      this.emitEvent({
        type: 'phaseChange',
        state: this.state,
        payload: { newPhase: 'rest', round: this.state.currentRound }
      });

      // Start rest period
      this.startWorkerTimer(this.currentPhaseDuration);

    } else {
      // Rest period completed - check if workout is done
      this.emitEvent({
        type: 'roundComplete',
        state: this.state,
        payload: { completedRound: this.state.currentRound }
      });

      if (this.state.currentRound >= this.config.totalRounds) {
        // Workout completed
        this.state.status = 'completed';
        this.state.workoutProgress = 1;
        
        this.emitEvent({
          type: 'workoutComplete',
          state: this.state,
          payload: { totalRounds: this.config.totalRounds }
        });
      } else {
        // Start next round
        this.state.currentRound++;
        this.state.phase = 'work';
        this.state.timeRemaining = this.config.workDuration * 1000;
        this.state.warningTriggered = false;
        this.currentPhaseDuration = this.config.workDuration * 1000;
        
        this.emitEvent({
          type: 'phaseChange',
          state: this.state,
          payload: { newPhase: 'work', round: this.state.currentRound }
        });

        // Start work period
        this.startWorkerTimer(this.currentPhaseDuration);
      }
    }
  }

  /**
   * Start timer in Web Worker
   */
  private startWorkerTimer(duration: number): void {
    if (this.worker) {
      this.worker.postMessage({
        type: 'start',
        payload: { duration }
      });
    } else {
      console.error('[TimerEngine] Worker not available when trying to start timer');
    }
  }

  /**
   * Setup browser visibility change handling
   */
  private setupVisibilityHandling(): void {
    if (typeof document !== 'undefined') {
      this.visibilityChangeListener = () => {
        this.isDocumentVisible = !document.hidden;
        
        // Re-sync timer state when tab becomes visible
        if (this.isDocumentVisible && this.state.status === 'running') {
          this.requestWorkerStatus();
        }
      };

      document.addEventListener('visibilitychange', this.visibilityChangeListener);
    }
  }

  /**
   * Request current status from worker for sync
   */
  private requestWorkerStatus(): void {
    if (this.worker) {
      this.worker.postMessage({ type: 'status' });
    }
  }

  /**
   * Setup mobile background execution handling
   * Handles mobile browser limitations and background throttling
   */
  private setupMobileBackgroundHandling(): void {
    if (typeof window === 'undefined') return;

    // Handle page freeze/resume events (mobile browsers)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data) {
          switch (event.data.type) {
            case 'PAGE_FROZEN':
              this.handlePageFreeze();
              break;
            case 'PAGE_RESUMED':
              this.handlePageResume();
              break;
          }
        }
      });

      // Send keep-alive pings to service worker for precise timing
      if (this.state.status === 'running') {
        this.startKeepAlivePings();
      }
    }

    // Handle battery optimization warnings
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        if (battery.level < 0.15) {
          console.warn('[TimerEngine] Low battery detected, timer precision may be affected');
        }
      });
    }

    // Handle network status for offline timing
    window.addEventListener('offline', () => {
      console.log('[TimerEngine] Device went offline, timer continues with local timing');
    });

    window.addEventListener('online', () => {
      console.log('[TimerEngine] Device back online');
    });
  }

  /**
   * Handle mobile page freeze
   */
  private handlePageFreeze(): void {
    if (this.state.status === 'running' && this.worker) {
      // Send timestamp to worker for accurate timing recovery
      this.worker.postMessage({ 
        type: 'freeze',
        timestamp: Date.now(),
        state: this.state
      });
      console.log('[TimerEngine] Page frozen, timer continues in background');
    }
  }

  /**
   * Handle mobile page resume
   */
  private handlePageResume(): void {
    if (this.state.status === 'running') {
      // Request current state from worker to resync
      this.requestWorkerStatus();
      console.log('[TimerEngine] Page resumed, resyncing timer state');
    }
  }

  /**
   * Start keep-alive pings to service worker
   */
  private startKeepAlivePings(): void {
    const pingInterval = setInterval(() => {
      if (this.state.status !== 'running') {
        clearInterval(pingInterval);
        return;
      }

      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => {
          if (event.data && event.data.type === 'KEEP_ALIVE_ACK') {
            // Service worker is responsive
          }
        };

        navigator.serviceWorker.controller.postMessage(
          { type: 'KEEP_ALIVE' },
          [channel.port2]
        );
      }
    }, 5000); // Ping every 5 seconds
  }

  // Public API methods

  /**
   * Start the workout timer
   */
  start(): void {
    if (this.state.status === 'running') {
      return; // Already running
    }

    const wasIdle = this.state.status === 'idle';
    this.state.status = 'running';
    
    // If starting from idle state, ensure timeRemaining is set to full phase duration
    if (wasIdle || this.state.timeRemaining <= 0) {
      // Fresh start - reset timeRemaining to full phase duration
      if (this.state.phase === 'preparation') {
        this.state.timeRemaining = (this.config.prepDuration || 10) * 1000;
        // Emit preparation start event
        this.emitEvent({
          type: 'preparationStart',
          state: { ...this.state }
        });
      } else if (this.state.phase === 'work') {
        this.state.timeRemaining = this.config.workDuration * 1000;
      } else {
        this.state.timeRemaining = this.config.restDuration * 1000;
      }
    }
    
    // Use the current timeRemaining as the duration to start the worker with
    this.currentPhaseDuration = this.state.timeRemaining;

    // Start mobile keep-alive pings when timer starts
    this.startKeepAlivePings();

    // Start the worker with the remaining time
    this.startWorkerTimer(this.currentPhaseDuration);
  }

  /**
   * Pause the timer
   */
  pause(): void {
    if (this.state.status !== 'running') {
      return;
    }

    if (this.worker) {
      this.worker.postMessage({ type: 'pause' });
    }
  }

  /**
   * Resume paused timer
   */
  resume(): void {
    if (this.state.status !== 'paused') {
      return;
    }

    this.state.status = 'running';
    
    if (this.worker) {
      this.worker.postMessage({ type: 'resume' });
    }
  }

  /**
   * Stop and reset timer to initial state
   */
  stop(): void {
    if (this.worker) {
      this.worker.postMessage({ type: 'stop' });
    }
    
    this.state = this.createInitialState();
    this.emitEvent({ type: 'tick', state: this.state });
  }

  /**
   * Reset timer to initial state without starting
   */
  reset(): void {
    this.stop();
  }

  /**
   * Update timer configuration
   */
  updateConfig(newConfig: Partial<TimerConfig>): void {
    const wasRunning = this.state.status === 'running';
    
    if (wasRunning) {
      this.stop();
    }

    this.config = { ...this.config, ...newConfig };
    this.state = this.createInitialState();
    
    this.emitEvent({ type: 'tick', state: this.state });
  }

  /**
   * Get current timer state
   */
  getState(): TimerState {
    return { ...this.state };
  }

  /**
   * Get current timer configuration
   */
  getConfig(): TimerConfig {
    return { ...this.config };
  }

  /**
   * Add event listener
   */
  addEventListener(handler: TimerEventHandler): () => void {
    this.eventHandlers.add(handler);
    
    // Return cleanup function
    return () => {
      this.eventHandlers.delete(handler);
    };
  }

  /**
   * Remove event listener
   */
  removeEventListener(handler: TimerEventHandler): void {
    this.eventHandlers.delete(handler);
  }

  /**
   * Emit event to all listeners
   */
  private emitEvent(event: TimerEvent): void {
    this.eventHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Timer event handler error:', error);
      }
    });
  }

  /**
   * Cleanup resources and terminate worker
   */
  destroy(): void {
    // Remove visibility change listener
    if (this.visibilityChangeListener && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityChangeListener);
    }

    // Clear event handlers
    this.eventHandlers.clear();

    // Terminate worker
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    // Reset state
    this.state = this.createInitialState();
  }
}

/**
 * Utility function to create timer with common boxing presets
 */
export function createBoxingTimer(preset: 'beginner' | 'intermediate' | 'advanced' | TimerConfig): TimerEngine {
  let config: TimerConfig;

  if (typeof preset === 'string') {
    switch (preset) {
      case 'beginner':
        config = {
          workDuration: 120, // 2 minutes
          restDuration: 60,  // 1 minute
          totalRounds: 3,
          enableWarning: true,
          prepDuration: 10   // 10 seconds get ready
        };
        break;
        
      case 'intermediate':
        config = {
          workDuration: 180, // 3 minutes
          restDuration: 60,  // 1 minute
          totalRounds: 5,
          enableWarning: true,
          prepDuration: 10   // 10 seconds get ready
        };
        break;
        
      case 'advanced':
        config = {
          workDuration: 180, // 3 minutes
          restDuration: 60,  // 1 minute
          totalRounds: 12,
          enableWarning: true,
          prepDuration: 5    // 5 seconds get ready (experienced users)
        };
        break;
        
      default:
        throw new Error(`Unknown preset: ${preset}`);
    }
  } else {
    config = preset;
  }

  return new TimerEngine(config);
}