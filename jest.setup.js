/**
 * Jest Setup File for Boxing Timer MVP
 * 
 * Global test setup including DOM testing utilities, Web Worker mocks,
 * Web Audio API mocks, and performance timing utilities for accurate testing.
 */

import '@testing-library/jest-dom'

// Mock Web Worker for timer engine testing
// Note: The actual MockWorker implementation is in jest.worker-mock.js
// This section just sets up additional mocks that work with the MockWorker

// Mock Web Audio API
class AudioContextMock {
  constructor() {
    this.state = 'running'
    this.currentTime = 0
    this.destination = {}
    this.sampleRate = 44100
    
    // Start time progression simulation
    this.startTime = performance.now()
    Object.defineProperty(this, 'currentTime', {
      get: () => (performance.now() - this.startTime) / 1000
    })
  }
  
  createGain() {
    return {
      gain: {
        value: 1,
        setValueAtTime: jest.fn(),
        linearRampToValueAtTime: jest.fn(),
        exponentialRampToValueAtTime: jest.fn()
      },
      connect: jest.fn()
    }
  }
  
  createOscillator() {
    return {
      frequency: {
        setValueAtTime: jest.fn()
      },
      type: 'sine',
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn()
    }
  }
  
  createBufferSource() {
    return {
      buffer: null,
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn()
    }
  }
  
  decodeAudioData(arrayBuffer) {
    return Promise.resolve({
      duration: 1.0,
      sampleRate: 44100,
      numberOfChannels: 2,
      length: 44100
    })
  }
  
  resume() {
    this.state = 'running'
    return Promise.resolve()
  }
  
  suspend() {
    this.state = 'suspended'
    return Promise.resolve()
  }
  
  close() {
    this.state = 'closed'
    return Promise.resolve()
  }
}

// Mock HTML Audio Element
class HTMLAudioElementMock {
  constructor() {
    this.src = ''
    this.volume = 1
    this.currentTime = 0
    this.duration = 1
    this.paused = true
    this.ended = false
    this.readyState = 4
    this.preload = 'auto'
    this.crossOrigin = null
    
    // Event handling
    this.eventListeners = {}
  }
  
  play() {
    this.paused = false
    setTimeout(() => {
      this.dispatchEvent('canplaythrough')
    }, 10)
    return Promise.resolve()
  }
  
  pause() {
    this.paused = true
  }
  
  load() {
    setTimeout(() => {
      this.dispatchEvent('canplaythrough')
    }, 10)
  }
  
  addEventListener(event, callback, options) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = []
    }
    this.eventListeners[event].push({ callback, options })
  }
  
  removeEventListener(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(
        listener => listener.callback !== callback
      )
    }
  }
  
  dispatchEvent(eventType) {
    if (this.eventListeners[eventType]) {
      this.eventListeners[eventType].forEach(({ callback, options }) => {
        callback(new Event(eventType))
        if (options?.once) {
          this.removeEventListener(eventType, callback)
        }
      })
    }
  }
}

// Performance timing utilities for precision testing
global.performance = global.performance || {
  now: () => Date.now(),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn(() => []),
  getEntriesByType: jest.fn(() => []),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn()
}

// Mock requestAnimationFrame for animation testing
global.requestAnimationFrame = global.requestAnimationFrame || ((callback) => {
  return setTimeout(() => callback(performance.now()), 16)
})

global.cancelAnimationFrame = global.cancelAnimationFrame || ((id) => {
  clearTimeout(id)
})

// Set up global mocks
beforeAll(() => {
  // Worker mock is set up in jest.worker-mock.js via setupFiles
  
  // Mock Web Audio API
  global.AudioContext = AudioContextMock
  global.webkitAudioContext = AudioContextMock
  global.mozAudioContext = AudioContextMock
  
  // Mock HTML Audio
  global.Audio = HTMLAudioElementMock
  
  // Mock fetch for audio file loading
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
    })
  )
  
  // Mock localStorage
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    length: 0,
    key: jest.fn()
  }
  Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true
  })
  
  // Mock document visibility API
  Object.defineProperty(document, 'hidden', {
    writable: true,
    value: false
  })
  
  Object.defineProperty(document, 'visibilityState', {
    writable: true,
    value: 'visible'
  })
})

// Clean up after each test
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks()
  
  // Reset localStorage mock
  if (localStorage.getItem && localStorage.getItem.mockClear) {
    localStorage.getItem.mockClear()
  }
  if (localStorage.setItem && localStorage.setItem.mockClear) {
    localStorage.setItem.mockClear()
  }
  if (localStorage.removeItem && localStorage.removeItem.mockClear) {
    localStorage.removeItem.mockClear()
  }
  if (localStorage.clear && localStorage.clear.mockClear) {
    localStorage.clear.mockClear()
  }
  
  // Reset fetch mock
  if (fetch.mockClear) {
    fetch.mockClear()
  }
  
  // Reset document visibility
  document.hidden = false
  document.visibilityState = 'visible'
})

// Utility functions for testing
global.testUtils = {
  // Wait for next tick
  waitForNextTick: () => new Promise(resolve => setTimeout(resolve, 0)),
  
  // Wait for specified time
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Mock timer precision testing
  mockHighPrecisionTimer: (duration = 10000, precision = 50) => {
    let startTime = performance.now()
    let elapsedTime = 0
    
    return {
      getElapsed: () => elapsedTime,
      getRemaining: () => Math.max(0, duration - elapsedTime),
      tick: (deltaTime = precision) => {
        elapsedTime += deltaTime
        return elapsedTime < duration
      },
      isComplete: () => elapsedTime >= duration,
      reset: () => {
        startTime = performance.now()
        elapsedTime = 0
      }
    }
  },
  
  // Audio testing utilities
  createMockAudioBuffer: (duration = 1.0) => ({
    duration,
    sampleRate: 44100,
    numberOfChannels: 2,
    length: Math.floor(44100 * duration)
  }),
  
  // Timer state validation
  validateTimerState: (state, expectedPhase, expectedRound, toleranceMs = 100) => {
    expect(state.phase).toBe(expectedPhase)
    expect(state.currentRound).toBe(expectedRound)
    expect(state.timeRemaining).toBeGreaterThanOrEqual(0)
    expect(state.progress).toBeGreaterThanOrEqual(0)
    expect(state.progress).toBeLessThanOrEqual(1)
    expect(state.workoutProgress).toBeGreaterThanOrEqual(0)
    expect(state.workoutProgress).toBeLessThanOrEqual(1)
  }
}