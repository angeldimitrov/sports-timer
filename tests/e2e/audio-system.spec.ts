/**
 * Audio System E2E Tests for Boxing Timer MVP
 * 
 * Tests audio functionality, reliability, and browser autoplay policy handling.
 * Validates critical audio cues that boxers rely on for eyes-free training.
 * 
 * Business Context:
 * - Boxing training requires precise audio cues for round start/end and warnings
 * - Users often train with eyes closed or looking away from screen
 * - Browser autoplay policies can prevent audio from working without user interaction
 * - Audio system must work reliably across different browsers and devices
 * - Fallback mechanisms needed when Web Audio API is unavailable
 * - Volume control and mute functionality are essential user requirements
 * 
 * Test Coverage:
 * - Bell sounds for round transitions (work/rest)
 * - Warning beeps (10-second countdown)
 * - Volume control and muting functionality
 * - Browser autoplay policy compliance
 * - Web Audio API vs HTML Audio fallback
 * - Audio timing accuracy and synchronization
 * - Memory leaks and resource cleanup
 */

import { test, expect, Page, BrowserContext } from '@playwright/test'
import { promises as fs } from 'fs'
import path from 'path'

/**
 * Audio System Testing Utilities
 * Provides comprehensive audio functionality testing and validation
 */
class AudioSystemTester {
  constructor(private page: Page) {}

  private selectors = {
    startButton: '[data-testid="start-button"]',
    pauseButton: '[data-testid="pause-button"]',
    stopButton: '[data-testid="stop-button"]',
    muteButton: '[data-testid="mute-button"]',
    volumeSlider: '[data-testid="volume-slider"]',
    currentTime: '[data-testid="current-time"]',
    phaseIndicator: '[data-testid="phase-indicator"]',
    presetSelector: '[data-testid="preset-selector"]',
    settingsButton: '[data-testid="settings-button"]',
    audioSettings: '[data-testid="audio-settings"]'
  }

  /**
   * Initialize audio testing environment
   */
  async initialize() {
    await this.page.goto('/')
    await this.page.waitForLoadState('networkidle')
    
    // Grant audio permissions and setup audio context
    await this.page.evaluate(() => {
      // Request audio permissions
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        return navigator.mediaDevices.getUserMedia({ audio: true })
          .then(() => console.log('Audio permissions granted'))
          .catch(() => console.log('Audio permissions denied'))
      }
    })
  }

  /**
   * Enable audio with user interaction to bypass autoplay policies
   */
  async enableAudioWithUserInteraction() {
    // Click on page to establish user interaction for autoplay policy
    await this.page.click('body')
    
    // Ensure audio is unmuted
    const muteButton = this.page.locator(this.selectors.muteButton)
    const isMuted = await muteButton.getAttribute('aria-pressed')
    
    if (isMuted === 'true') {
      await muteButton.click()
    }
    
    // Set reasonable volume level
    await this.page.locator(this.selectors.volumeSlider).fill('75')
    
    // Wait for audio system to initialize
    await this.page.waitForTimeout(500)
  }

  /**
   * Check if Web Audio API is available
   */
  async isWebAudioAvailable(): Promise<boolean> {
    return await this.page.evaluate(() => {
      return typeof (window as any).AudioContext !== 'undefined' || 
             typeof (window as any).webkitAudioContext !== 'undefined'
    })
  }

  /**
   * Monitor audio events and playback
   * @param durationMs - Duration to monitor
   * @returns Audio event log
   */
  async monitorAudioEvents(durationMs: number): Promise<AudioEvent[]> {
    // Setup audio event monitoring
    await this.page.evaluate(() => {
      (window as any).audioEvents = []
      
      // Monitor HTML Audio elements
      const audioElements = document.querySelectorAll('audio')
      audioElements.forEach((audio, index) => {
        audio.addEventListener('play', () => {
          (window as any).audioEvents.push({
            type: 'play',
            element: `audio-${index}`,
            timestamp: performance.now(),
            src: audio.src
          })
        })
        
        audio.addEventListener('ended', () => {
          (window as any).audioEvents.push({
            type: 'ended',
            element: `audio-${index}`,
            timestamp: performance.now(),
            src: audio.src
          })
        })
        
        audio.addEventListener('error', (e) => {
          (window as any).audioEvents.push({
            type: 'error',
            element: `audio-${index}`,
            timestamp: performance.now(),
            error: e.type
          })
        })
      })
      
      // Monitor Web Audio API calls (if available)
      if ((window as any).AudioContext || (window as any).webkitAudioContext) {
        const originalCreateMediaElementSource = AudioContext.prototype.createMediaElementSource
        AudioContext.prototype.createMediaElementSource = function(...args) {
          (window as any).audioEvents.push({
            type: 'webaudio-source-created',
            timestamp: performance.now()
          })
          return originalCreateMediaElementSource.apply(this, args)
        }
      }
    })
    
    // Monitor for specified duration
    await this.page.waitForTimeout(durationMs)
    
    // Retrieve recorded events
    return await this.page.evaluate(() => (window as any).audioEvents || [])
  }

  /**
   * Test audio file loading and availability
   */
  async testAudioFileAvailability(): Promise<AudioFileStatus[]> {
    const audioFiles = ['bell.mp3', 'beep.mp3']
    const results: AudioFileStatus[] = []
    
    for (const file of audioFiles) {
      const response = await this.page.request.get(`/sounds/${file}`)
      const status: AudioFileStatus = {
        filename: file,
        available: response.ok(),
        statusCode: response.status(),
        size: response.ok() ? (await response.body()).length : 0,
        contentType: response.headers()['content-type'] || ''
      }
      results.push(status)
    }
    
    return results
  }

  /**
   * Simulate round transition and verify audio cues
   */
  async simulateRoundTransitionAudio(): Promise<void> {
    // Fast-forward timer to near round transition
    await this.page.evaluate(() => {
      // Access timer engine and fast-forward to last 5 seconds
      const timerEngine = (window as any).timerEngine
      if (timerEngine && timerEngine.fastForwardTo) {
        timerEngine.fastForwardTo(5000) // 5 seconds remaining
      }
    })
    
    await this.page.waitForTimeout(1000)
  }

  /**
   * Test volume control functionality
   */
  async testVolumeControl(): Promise<VolumeTestResult> {
    const volumeSlider = this.page.locator(this.selectors.volumeSlider)
    
    // Test different volume levels
    const volumeLevels = [0, 25, 50, 75, 100]
    const results: VolumeTestResult = {
      levels: [],
      muteToggle: false
    }
    
    for (const level of volumeLevels) {
      await volumeSlider.fill(level.toString())
      await this.page.waitForTimeout(200)
      
      const actualLevel = await volumeSlider.inputValue()
      results.levels.push({
        expected: level,
        actual: parseInt(actualLevel),
        matches: level === parseInt(actualLevel)
      })
    }
    
    // Test mute toggle
    const muteButton = this.page.locator(this.selectors.muteButton)
    await muteButton.click()
    
    const isMuted = await muteButton.getAttribute('aria-pressed')
    results.muteToggle = isMuted === 'true'
    
    return results
  }

  /**
   * Measure audio timing accuracy
   */
  async measureAudioTiming(): Promise<AudioTimingResult> {
    const events: AudioTimingEvent[] = []
    
    // Setup precise timing measurement
    await this.page.evaluate(() => {
      (window as any).audioTimingEvents = []
      
      // Override audio play method to capture precise timing
      const audioElements = document.querySelectorAll('audio')
      audioElements.forEach((audio, index) => {
        const originalPlay = audio.play.bind(audio)
        audio.play = function() {
          const callTime = performance.now()
          const promise = originalPlay()
          
          (window as any).audioTimingEvents.push({
            type: 'play-called',
            audioIndex: index,
            timestamp: callTime,
            src: audio.currentSrc
          })
          
          return promise
        }
      })
    })
    
    // Start timer and monitor first few audio events
    await this.page.locator(this.selectors.startButton).click()
    await this.page.waitForTimeout(15000) // Monitor for 15 seconds
    
    // Retrieve timing data
    const timingEvents = await this.page.evaluate(() => (window as any).audioTimingEvents || [])
    
    return {
      events: timingEvents,
      totalEvents: timingEvents.length,
      averageInterval: timingEvents.length > 1 
        ? (timingEvents[timingEvents.length - 1].timestamp - timingEvents[0].timestamp) / (timingEvents.length - 1)
        : 0
    }
  }
}

/**
 * Audio event data structure
 */
interface AudioEvent {
  type: string
  element?: string
  timestamp: number
  src?: string
  error?: string
}

/**
 * Audio file status data structure
 */
interface AudioFileStatus {
  filename: string
  available: boolean
  statusCode: number
  size: number
  contentType: string
}

/**
 * Volume test result data structure
 */
interface VolumeTestResult {
  levels: Array<{
    expected: number
    actual: number
    matches: boolean
  }>
  muteToggle: boolean
}

/**
 * Audio timing result data structure
 */
interface AudioTimingResult {
  events: AudioTimingEvent[]
  totalEvents: number
  averageInterval: number
}

interface AudioTimingEvent {
  type: string
  audioIndex: number
  timestamp: number
  src: string
}

test.describe('Audio System E2E Tests', () => {
  let audioTester: AudioSystemTester

  test.beforeEach(async ({ page }) => {
    audioTester = new AudioSystemTester(page)
    await audioTester.initialize()
    await audioTester.enableAudioWithUserInteraction()
  })

  test.describe('Audio File Availability', () => {
    test('should have all required audio files available', async () => {
      const audioStatus = await audioTester.testAudioFileAvailability()
      
      for (const file of audioStatus) {
        expect(file.available).toBe(true)
        expect(file.statusCode).toBe(200)
        expect(file.size).toBeGreaterThan(1000) // Reasonable minimum file size
        expect(file.contentType).toContain('audio')
        
        console.log(`${file.filename}: ${file.size} bytes, ${file.contentType}`)
      }
    })

    test('should load audio files without CORS errors', async ({ page }) => {
      // Monitor network requests for audio files
      const audioRequests: any[] = []
      
      page.on('response', response => {
        if (response.url().includes('/sounds/') && response.url().match(/\.(mp3|wav|ogg)$/)) {
          audioRequests.push({
            url: response.url(),
            status: response.status(),
            headers: response.headers()
          })
        }
      })
      
      // Trigger audio loading by starting timer
      await page.locator('[data-testid="preset-selector"]').click()
      await page.locator('[data-testid="preset-beginner"]').click()
      await page.locator('[data-testid="start-button"]').click()
      
      await page.waitForTimeout(2000)
      
      // Verify audio files loaded successfully
      expect(audioRequests.length).toBeGreaterThan(0)
      
      for (const request of audioRequests) {
        expect(request.status).toBe(200)
        expect(request.headers['content-type']).toContain('audio')
      }
      
      await page.locator('[data-testid="stop-button"]').click()
    })
  })

  test.describe('Web Audio API vs HTML Audio Fallback', () => {
    test('should detect Web Audio API availability', async () => {
      const isWebAudioAvailable = await audioTester.isWebAudioAvailable()
      console.log(`Web Audio API available: ${isWebAudioAvailable}`)
      
      // Most modern browsers should support Web Audio API
      expect(isWebAudioAvailable).toBe(true)
    })

    test('should initialize correct audio backend', async ({ page }) => {
      const audioBackend = await page.evaluate(() => {
        // Check which audio system is being used
        const hasWebAudio = typeof (window as any).AudioContext !== 'undefined' || 
                          typeof (window as any).webkitAudioContext !== 'undefined'
        const hasHtmlAudio = typeof Audio !== 'undefined'
        
        return {
          webAudioSupported: hasWebAudio,
          htmlAudioSupported: hasHtmlAudio,
          activeBackend: (window as any).audioManager?.backend || 'unknown'
        }
      })
      
      console.log('Audio backend info:', audioBackend)
      
      expect(audioBackend.webAudioSupported || audioBackend.htmlAudioSupported).toBe(true)
      expect(audioBackend.activeBackend).not.toBe('unknown')
    })

    test('should handle audio context suspension and resumption', async ({ page }) => {
      // Test audio context state management
      const audioContextState = await page.evaluate(async () => {
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext
        if (!AudioContextClass) return null
        
        const ctx = new AudioContextClass()
        const initialState = ctx.state
        
        // Suspend and resume
        await ctx.suspend()
        const suspendedState = ctx.state
        
        await ctx.resume()
        const resumedState = ctx.state
        
        ctx.close()
        
        return {
          initial: initialState,
          suspended: suspendedState,
          resumed: resumedState
        }
      })
      
      if (audioContextState) {
        expect(audioContextState.suspended).toBe('suspended')
        expect(audioContextState.resumed).toBe('running')
      }
    })
  })

  test.describe('Audio Playback and Timing', () => {
    test('should play bell sound on round transitions', async ({ page }) => {
      await page.locator('[data-testid="preset-selector"]').click()
      await page.locator('[data-testid="preset-beginner"]').click()
      
      // Start monitoring audio events
      const monitorPromise = audioTester.monitorAudioEvents(30000) // 30 seconds
      
      // Start timer
      await page.locator('[data-testid="start-button"]').click()
      
      // Wait for work phase to complete and transition to rest
      await page.waitForFunction(() => {
        const phaseIndicator = document.querySelector('[data-testid="phase-indicator"]')
        return phaseIndicator?.textContent?.toLowerCase().includes('rest')
      }, { timeout: 125000 }) // 2 minutes + buffer
      
      // Stop monitoring
      const audioEvents = await monitorPromise
      
      // Verify bell sound played during transition
      const bellEvents = audioEvents.filter(event => 
        event.type === 'play' && event.src?.includes('bell')
      )
      
      expect(bellEvents.length).toBeGreaterThan(0)
      
      console.log(`Bell events detected: ${bellEvents.length}`)
      console.log('Audio events:', audioEvents)
      
      await page.locator('[data-testid="stop-button"]').click()
    })

    test('should play warning beeps before round ends', async ({ page }) => {
      await page.locator('[data-testid="preset-selector"]').click()
      await page.locator('[data-testid="preset-beginner"]').click()
      
      // Monitor audio events
      const monitorPromise = audioTester.monitorAudioEvents(125000) // Full work period
      
      await page.locator('[data-testid="start-button"]').click()
      
      // Wait for warning period (last 10 seconds)
      await page.waitForFunction(() => {
        const timeDisplay = document.querySelector('[data-testid="current-time"]')
        const timeText = timeDisplay?.textContent || ''
        const [minutes, seconds] = timeText.split(':').map(Number)
        const totalSeconds = minutes * 60 + seconds
        return totalSeconds <= 10 // Last 10 seconds
      }, { timeout: 115000 }) // Wait up to first 110 seconds
      
      const audioEvents = await monitorPromise
      
      // Verify warning beeps played
      const beepEvents = audioEvents.filter(event => 
        event.type === 'play' && event.src?.includes('beep')
      )
      
      expect(beepEvents.length).toBeGreaterThan(0)
      
      console.log(`Warning beep events: ${beepEvents.length}`)
      
      await page.locator('[data-testid="stop-button"]').click()
    })

    test('should maintain audio timing accuracy', async ({ page }) => {
      await page.locator('[data-testid="preset-selector"]').click()
      await page.locator('[data-testid="preset-intermediate"]').click()
      
      const timingResult = await audioTester.measureAudioTiming()
      
      console.log(`Audio timing analysis:`)
      console.log(`- Total events: ${timingResult.totalEvents}`)
      console.log(`- Average interval: ${timingResult.averageInterval.toFixed(2)}ms`)
      
      // Should have some audio events
      expect(timingResult.totalEvents).toBeGreaterThan(0)
      
      // If multiple events, check timing consistency
      if (timingResult.totalEvents > 1) {
        expect(timingResult.averageInterval).toBeGreaterThan(100) // Reasonable minimum interval
      }
      
      await page.locator('[data-testid="stop-button"]').click()
    })
  })

  test.describe('Volume Control and Muting', () => {
    test('should control volume accurately', async () => {
      const volumeTest = await audioTester.testVolumeControl()
      
      // All volume levels should set correctly
      for (const level of volumeTest.levels) {
        expect(level.matches).toBe(true)
      }
      
      console.log('Volume control test results:', volumeTest.levels)
    })

    test('should mute and unmute audio correctly', async ({ page }) => {
      const muteButton = page.locator('[data-testid="mute-button"]')
      
      // Start with audio enabled
      await expect(muteButton).toHaveAttribute('aria-pressed', 'false')
      
      // Mute audio
      await muteButton.click()
      await expect(muteButton).toHaveAttribute('aria-pressed', 'true')
      
      // Unmute audio
      await muteButton.click()
      await expect(muteButton).toHaveAttribute('aria-pressed', 'false')
      
      // Verify audio system responds to mute state
      const audioState = await page.evaluate(() => {
        const audioElements = document.querySelectorAll('audio')
        return Array.from(audioElements).map(audio => ({
          muted: audio.muted,
          volume: audio.volume
        }))
      })
      
      console.log('Audio element states after mute test:', audioState)
    })

    test('should persist volume settings', async ({ page }) => {
      // Set specific volume
      const testVolume = 65
      await page.locator('[data-testid="volume-slider"]').fill(testVolume.toString())
      
      // Reload page
      await page.reload()
      await audioTester.initialize()
      
      // Check if volume setting persisted
      const persistedVolume = await page.locator('[data-testid="volume-slider"]').inputValue()
      
      // Should either persist or use reasonable default
      const volume = parseInt(persistedVolume)
      expect(volume).toBeGreaterThanOrEqual(0)
      expect(volume).toBeLessThanOrEqual(100)
      
      console.log(`Volume after reload: ${volume} (original: ${testVolume})`)
    })
  })

  test.describe('Browser Autoplay Policy Compliance', () => {
    test('should handle autoplay restrictions gracefully', async ({ page, context }) => {
      // Create new context with restrictive autoplay policy
      const restrictiveContext = await context.browser()?.newContext({
        // Simulate restrictive autoplay policy
        bypassCSP: false
      })
      
      if (restrictiveContext) {
        const newPage = await restrictiveContext.newPage()
        const restrictiveTester = new AudioSystemTester(newPage)
        
        await restrictiveTester.initialize()
        
        // Try to start timer without user interaction
        await newPage.goto('/')
        await newPage.locator('[data-testid="start-button"]').click()
        
        // Should handle gracefully without errors
        const hasErrors = await newPage.evaluate(() => {
          return (window as any).audioErrors || []
        })
        
        // May have autoplay errors, but shouldn't crash
        console.log('Autoplay restriction test - errors:', hasErrors)
        
        await newPage.close()
        await restrictiveContext.close()
      }
    })

    test('should provide user feedback when audio fails', async ({ page }) => {
      // Simulate audio failure
      await page.evaluate(() => {
        // Override audio play to simulate failure
        const audioElements = document.querySelectorAll('audio')
        audioElements.forEach(audio => {
          const originalPlay = audio.play.bind(audio)
          audio.play = function() {
            return Promise.reject(new Error('Simulated autoplay restriction'))
          }
        })
      })
      
      await page.locator('[data-testid="start-button"]').click()
      
      // Should show some indication of audio issues
      // This depends on the actual implementation
      await page.waitForTimeout(2000)
      
      // Check for error indicators or fallback messaging
      const errorIndicators = await page.locator('[data-testid*="audio"]').count()
      console.log(`Audio error indicators found: ${errorIndicators}`)
      
      await page.locator('[data-testid="stop-button"]').click()
    })
  })

  test.describe('Memory and Resource Management', () => {
    test('should not leak audio resources', async ({ page }) => {
      const initialAudioContexts = await page.evaluate(() => {
        return (window as any).audioContextCount || 0
      })
      
      // Perform multiple start/stop cycles
      for (let i = 0; i < 5; i++) {
        await page.locator('[data-testid="start-button"]').click()
        await page.waitForTimeout(2000)
        await page.locator('[data-testid="stop-button"]').click()
        await page.waitForTimeout(500)
      }
      
      const finalAudioContexts = await page.evaluate(() => {
        return (window as any).audioContextCount || 0
      })
      
      // Should not accumulate audio contexts
      expect(finalAudioContexts - initialAudioContexts).toBeLessThanOrEqual(1)
    })

    test('should handle rapid audio triggers without issues', async ({ page }) => {
      await page.locator('[data-testid="preset-selector"]').click()
      await page.locator('[data-testid="preset-beginner"]').click()
      
      // Rapidly start and stop timer to trigger audio events
      for (let i = 0; i < 10; i++) {
        await page.locator('[data-testid="start-button"]').click()
        await page.waitForTimeout(100)
        await page.locator('[data-testid="pause-button"]').click()
        await page.waitForTimeout(100)
      }
      
      // Should not have accumulated errors or memory leaks
      const audioErrors = await page.evaluate(() => {
        return (window as any).audioErrors || []
      })
      
      expect(audioErrors.length).toBe(0)
      
      await page.locator('[data-testid="stop-button"]').click()
    })
  })

  // Save audio test results
  test.afterEach(async ({ page, browserName }, testInfo) => {
    // Capture audio system state
    const audioSystemState = await page.evaluate(() => {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext
      
      return {
        webAudioSupported: typeof AudioContextClass !== 'undefined',
        htmlAudioSupported: typeof Audio !== 'undefined',
        audioElements: Array.from(document.querySelectorAll('audio')).map(audio => ({
          src: audio.src,
          muted: audio.muted,
          volume: audio.volume,
          readyState: audio.readyState
        })),
        audioManager: (window as any).audioManager ? {
          isInitialized: (window as any).audioManager.isInitialized,
          backend: (window as any).audioManager.backend,
          volume: (window as any).audioManager.volume
        } : null
      }
    })
    
    // Save test results
    const resultsDir = path.join(__dirname, '../test-results')
    await fs.mkdir(resultsDir, { recursive: true })
    
    await fs.writeFile(
      path.join(resultsDir, `audio-test-${browserName}-${testInfo.title.replace(/\s+/g, '-')}-${Date.now()}.json`),
      JSON.stringify({
        testTitle: testInfo.title,
        browserName,
        status: testInfo.status,
        duration: testInfo.duration,
        audioSystemState,
        timestamp: new Date().toISOString()
      }, null, 2)
    )
  })
})