/**
 * Precise Timer Web Worker
 * 
 * Provides high-accuracy timing for the Boxing Timer MVP using a Web Worker
 * to avoid main thread blocking and maintain ±100ms precision.
 * 
 * Features:
 * - High-resolution timing using performance.now()
 * - Drift compensation to maintain accuracy over time
 * - Proper handling of pause/resume with time offset tracking
 * - Self-correcting timer to prevent cumulative timing errors
 */

class PrecisionTimer {
  constructor() {
    this.isRunning = false;
    this.isPaused = false;
    this.startTime = 0;
    this.pausedTime = 0;
    this.duration = 0;
    this.remaining = 0;
    this.intervalId = null;
    
    // High-precision timing interval (10ms for smooth updates)
    this.tickInterval = 10;
    
    // Last known accurate time for drift compensation
    this.lastTickTime = 0;
    this.expectedNextTick = 0;
  }

  /**
   * Start the timer with specified duration
   * @param {number} durationMs - Duration in milliseconds
   */
  start(durationMs) {
    if (this.isRunning && !this.isPaused) {
      return; // Already running
    }

    this.duration = durationMs;
    
    if (this.isPaused) {
      // Resume from pause - adjust start time to account for paused duration
      const pauseDuration = performance.now() - this.pausedTime;
      this.startTime += pauseDuration;
      this.isPaused = false;
    } else {
      // Fresh start
      this.startTime = performance.now();
      this.remaining = durationMs;
    }

    this.isRunning = true;
    this.lastTickTime = performance.now();
    this.expectedNextTick = this.lastTickTime + this.tickInterval;
    
    this.tick();
  }

  /**
   * Pause the timer, preserving current state
   */
  pause() {
    if (!this.isRunning || this.isPaused) {
      return;
    }

    this.isPaused = true;
    this.pausedTime = performance.now();
    
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }

    this.postMessage({
      type: 'paused',
      remaining: this.remaining,
      elapsed: this.duration - this.remaining
    });
  }

  /**
   * Stop and reset the timer
   */
  stop() {
    this.isRunning = false;
    this.isPaused = false;
    this.remaining = 0;
    
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }

    this.postMessage({
      type: 'stopped',
      remaining: 0,
      elapsed: this.duration
    });
  }

  /**
   * Reset timer to initial state without starting
   */
  reset() {
    this.stop();
    this.duration = 0;
    this.startTime = 0;
    this.pausedTime = 0;
    
    this.postMessage({
      type: 'reset',
      remaining: 0,
      elapsed: 0
    });
  }

  /**
   * Main timing loop with drift compensation
   * Uses self-correcting intervals to maintain precision
   */
  tick() {
    if (!this.isRunning || this.isPaused) {
      return;
    }

    const now = performance.now();
    const elapsed = now - this.startTime;
    this.remaining = Math.max(0, this.duration - elapsed);

    // Send progress update
    this.postMessage({
      type: 'tick',
      remaining: this.remaining,
      elapsed: elapsed,
      progress: elapsed / this.duration
    });

    // Check if timer completed
    if (this.remaining <= 0) {
      this.isRunning = false;
      this.postMessage({
        type: 'completed',
        remaining: 0,
        elapsed: this.duration
      });
      return;
    }

    // Calculate next tick with drift compensation
    // This ensures we maintain accurate timing even if the browser is under load
    const drift = now - this.expectedNextTick;
    const nextTickDelay = Math.max(1, this.tickInterval - drift);
    
    this.expectedNextTick = now + nextTickDelay;
    this.lastTickTime = now;

    // Schedule next tick
    this.intervalId = setTimeout(() => this.tick(), nextTickDelay);
  }

  /**
   * Get current timer status
   */
  getStatus() {
    const now = performance.now();
    let currentRemaining = this.remaining;
    let currentElapsed = 0;

    if (this.isRunning && !this.isPaused) {
      const elapsed = now - this.startTime;
      currentRemaining = Math.max(0, this.duration - elapsed);
      currentElapsed = elapsed;
    } else if (this.isPaused) {
      const elapsed = this.pausedTime - this.startTime;
      currentRemaining = Math.max(0, this.duration - elapsed);
      currentElapsed = elapsed;
    }

    return {
      type: 'status',
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      remaining: currentRemaining,
      elapsed: currentElapsed,
      duration: this.duration,
      progress: this.duration > 0 ? currentElapsed / this.duration : 0
    };
  }

  /**
   * Send message to main thread
   */
  postMessage(data) {
    self.postMessage({
      ...data,
      timestamp: performance.now()
    });
  }
}

// Initialize timer instance
const timer = new PrecisionTimer();

// Handle messages from main thread
self.onmessage = function(e) {
  const { type, payload } = e.data;

  switch (type) {
    case 'start':
      timer.start(payload.duration);
      break;
      
    case 'pause':
      timer.pause();
      break;
      
    case 'resume':
      timer.start(timer.duration);
      break;
      
    case 'stop':
      timer.stop();
      break;
      
    case 'reset':
      timer.reset();
      break;
      
    case 'status':
      timer.postMessage(timer.getStatus());
      break;
      
    default:
      timer.postMessage({
        type: 'error',
        message: `Unknown command: ${type}`
      });
  }
};

// Handle worker errors
self.onerror = function(error) {
  timer.postMessage({
    type: 'error',
    message: error.message,
    filename: error.filename,
    lineno: error.lineno
  });
};

// Send ready signal
timer.postMessage({
  type: 'ready',
  message: 'Timer worker initialized and ready'
});