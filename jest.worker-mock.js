/**
 * Web Worker Mock for Jest Testing
 * 
 * Provides a complete mock implementation of Web Worker for testing timer functionality
 * without requiring actual worker files during test execution.
 */

// Mock Worker implementation that simulates the timer-worker.js behavior
class MockWorker {
  constructor(scriptURL, options = {}) {
    this.scriptURL = scriptURL
    this.options = options
    this.onmessage = null
    this.onerror = null
    this.onmessageerror = null
    this.terminated = false
    
    // Internal state for timer simulation
    this.timerState = {
      isRunning: false,
      isPaused: false,
      startTime: 0,
      pausedTime: 0,
      duration: 0,
      remaining: 0
    }
    
    // Track messages for testing
    this.messageHistory = []
    this.lastMessage = null
    
    // Simulate worker initialization
    setTimeout(() => {
      if (!this.terminated) {
        this.sendMessage({
          type: 'ready',
          message: 'Timer worker initialized and ready',
          timestamp: performance.now()
        })
      }
    }, 0)
  }
  
  postMessage(data, transfer) {
    if (this.terminated) {
      console.warn('Cannot post message to terminated worker')
      return
    }
    
    this.messageHistory.push(data)
    this.lastMessage = data
    
    // Process the message and respond appropriately
    setTimeout(() => {
      if (!this.terminated) {
        this.handleMessage(data)
      }
    }, 1) // Minimal delay to simulate async behavior
  }
  
  handleMessage(data) {
    const { type, payload } = data
    
    switch (type) {
      case 'start':
        this.handleStart(payload)
        break
      case 'pause':
        this.handlePause()
        break
      case 'resume':
        this.handleResume()
        break
      case 'stop':
        this.handleStop()
        break
      case 'reset':
        this.handleReset()
        break
      case 'status':
        this.handleStatus()
        break
      default:
        this.sendMessage({
          type: 'error',
          message: `Unknown command: ${type}`,
          timestamp: performance.now()
        })
    }
  }
  
  handleStart(payload) {
    const { duration } = payload || {}
    
    if (!duration) {
      this.sendMessage({
        type: 'error',
        message: 'Duration is required for start command',
        timestamp: performance.now()
      })
      return
    }
    
    this.timerState.duration = duration
    this.timerState.remaining = duration
    this.timerState.startTime = performance.now()
    this.timerState.isRunning = true
    this.timerState.isPaused = false
    
    // Start the timer simulation
    this.startTicking()
  }
  
  handlePause() {
    if (!this.timerState.isRunning || this.timerState.isPaused) {
      return
    }
    
    this.timerState.isPaused = true
    this.timerState.pausedTime = performance.now()
    
    if (this.tickInterval) {
      clearInterval(this.tickInterval)
      this.tickInterval = null
    }
    
    this.sendMessage({
      type: 'paused',
      remaining: this.timerState.remaining,
      elapsed: this.timerState.duration - this.timerState.remaining,
      timestamp: performance.now()
    })
  }
  
  handleResume() {
    if (!this.timerState.isPaused) {
      return
    }
    
    // Adjust start time to account for pause duration
    const pauseDuration = performance.now() - this.timerState.pausedTime
    this.timerState.startTime += pauseDuration
    this.timerState.isPaused = false
    
    // Resume ticking
    this.startTicking()
  }
  
  handleStop() {
    this.timerState.isRunning = false
    this.timerState.isPaused = false
    this.timerState.remaining = 0
    
    if (this.tickInterval) {
      clearInterval(this.tickInterval)
      this.tickInterval = null
    }
    
    this.sendMessage({
      type: 'stopped',
      remaining: 0,
      elapsed: this.timerState.duration,
      timestamp: performance.now()
    })
  }
  
  handleReset() {
    this.handleStop()
    this.timerState.duration = 0
    this.timerState.startTime = 0
    this.timerState.pausedTime = 0
    
    this.sendMessage({
      type: 'reset',
      remaining: 0,
      elapsed: 0,
      timestamp: performance.now()
    })
  }
  
  handleStatus() {
    const now = performance.now()
    let currentRemaining = this.timerState.remaining
    let currentElapsed = 0
    
    if (this.timerState.isRunning && !this.timerState.isPaused) {
      const elapsed = now - this.timerState.startTime
      currentRemaining = Math.max(0, this.timerState.duration - elapsed)
      currentElapsed = elapsed
    } else if (this.timerState.isPaused) {
      const elapsed = this.timerState.pausedTime - this.timerState.startTime
      currentRemaining = Math.max(0, this.timerState.duration - elapsed)
      currentElapsed = elapsed
    }
    
    this.sendMessage({
      type: 'status',
      isRunning: this.timerState.isRunning,
      isPaused: this.timerState.isPaused,
      remaining: currentRemaining,
      elapsed: currentElapsed,
      duration: this.timerState.duration,
      progress: this.timerState.duration > 0 ? currentElapsed / this.timerState.duration : 0,
      timestamp: now
    })
  }
  
  startTicking() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval)
    }
    
    // Use a faster tick rate for testing (20ms instead of 10ms)
    this.tickInterval = setInterval(() => {
      if (this.terminated || !this.timerState.isRunning || this.timerState.isPaused) {
        return
      }
      
      const now = performance.now()
      const elapsed = now - this.timerState.startTime
      const remaining = Math.max(0, this.timerState.duration - elapsed)
      const progress = elapsed / this.timerState.duration
      
      this.timerState.remaining = remaining
      
      this.sendMessage({
        type: 'tick',
        remaining,
        elapsed,
        progress: Math.min(1, progress),
        timestamp: now
      })
      
      // Check for completion
      if (remaining <= 0) {
        this.timerState.isRunning = false
        clearInterval(this.tickInterval)
        this.tickInterval = null
        
        this.sendMessage({
          type: 'completed',
          remaining: 0,
          elapsed: this.timerState.duration,
          timestamp: now
        })
      }
    }, 20) // 20ms for testing
  }
  
  sendMessage(data) {
    if (this.terminated) {
      return
    }
    
    if (this.onmessage) {
      // Simulate the MessageEvent structure
      const event = {
        data,
        type: 'message',
        target: this,
        currentTarget: this,
        preventDefault: () => {},
        stopPropagation: () => {}
      }
      
      try {
        this.onmessage(event)
      } catch (error) {
        if (this.onerror) {
          this.onerror({
            message: error.message,
            filename: this.scriptURL,
            lineno: 0,
            colno: 0,
            error
          })
        }
      }
    }
  }
  
  terminate() {
    this.terminated = true
    this.onmessage = null
    this.onerror = null
    this.onmessageerror = null
    
    if (this.tickInterval) {
      clearInterval(this.tickInterval)
      this.tickInterval = null
    }
    
    // Reset timer state
    this.timerState = {
      isRunning: false,
      isPaused: false,
      startTime: 0,
      pausedTime: 0,
      duration: 0,
      remaining: 0
    }
  }
  
  // Testing utilities
  getMessageHistory() {
    return [...this.messageHistory]
  }
  
  getLastMessage() {
    return this.lastMessage
  }
  
  clearMessageHistory() {
    this.messageHistory = []
    this.lastMessage = null
  }
  
  getTimerState() {
    return { ...this.timerState }
  }
  
  // Force a tick for testing purposes
  forceTick() {
    if (this.timerState.isRunning && !this.timerState.isPaused) {
      const now = performance.now()
      const elapsed = now - this.timerState.startTime
      const remaining = Math.max(0, this.timerState.duration - elapsed)
      const progress = elapsed / this.timerState.duration
      
      this.sendMessage({
        type: 'tick',
        remaining,
        elapsed,
        progress: Math.min(1, progress),
        timestamp: now
      })
      
      return remaining > 0
    }
    return false
  }
}

// Replace the global Worker constructor
global.Worker = MockWorker

// Export for direct testing
module.exports = MockWorker