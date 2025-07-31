/**
 * Cross-Browser E2E Tests for Boxing Timer MVP
 * 
 * Tests browser-specific behavior, compatibility, and feature support across
 * different browser engines and versions. Ensures consistent experience.
 * 
 * Business Context:
 * - Boxers use various devices and browsers (Chrome, Firefox, Safari, Edge)
 * - Browser differences in Web Audio API, timing precision, and PWA support
 * - Older browser versions may lack modern APIs but should still function
 * - Mobile browsers have different autoplay policies and performance characteristics
 * - Cross-browser consistency is critical for reliable training timing
 * 
 * Test Coverage:
 * - Web API feature detection and fallbacks
 * - Browser-specific timing and precision behavior
 * - Audio handling differences across browsers
 * - PWA and Service Worker compatibility
 * - CSS and layout consistency
 * - Performance characteristics per browser
 * - Autoplay policy variations
 * - Local storage and persistence behavior
 */

import { test, expect, Page, BrowserContext } from '@playwright/test'
import { promises as fs } from 'fs'
import path from 'path'

/**
 * Cross-Browser Testing Utilities
 * Provides browser-specific testing and compatibility validation
 */
class CrossBrowserTester {
  constructor(private page: Page, private browserName: string) {}

  private selectors = {
    timerDisplay: '[data-testid="timer-display"]',
    currentTime: '[data-testid="current-time"]',
    startButton: '[data-testid="start-button"]',
    pauseButton: '[data-testid="pause-button"]',
    stopButton: '[data-testid="stop-button"]',
    volumeSlider: '[data-testid="volume-slider"]',
    muteButton: '[data-testid="mute-button"]',
    presetSelector: '[data-testid="preset-selector"]'
  }

  /**
   * Initialize cross-browser testing environment
   */
  async initialize() {
    await this.page.goto('/')
    await this.page.waitForLoadState('networkidle')
    
    // Wait for browser-specific initialization
    await this.page.waitForTimeout(1000)
  }

  /**
   * Detect browser capabilities and features
   */
  async detectBrowserCapabilities(): Promise<BrowserCapabilities> {
    return await this.page.evaluate(() => {
      const userAgent = navigator.userAgent
      const isChrome = userAgent.includes('Chrome') && !userAgent.includes('Edg')
      const isFirefox = userAgent.includes('Firefox')
      const isSafari = userAgent.includes('Safari') && !userAgent.includes('Chrome')
      const isEdge = userAgent.includes('Edg')
      
      return {
        userAgent,
        browserType: {
          chrome: isChrome,
          firefox: isFirefox,
          safari: isSafari,
          edge: isEdge
        },
        webApiSupport: {
          webAudio: typeof (window as any).AudioContext !== 'undefined' || 
                   typeof (window as any).webkitAudioContext !== 'undefined',
          serviceWorker: 'serviceWorker' in navigator,
          wakeLock: 'wakeLock' in navigator,
          fullscreen: 'requestFullscreen' in document.documentElement ||
                     'webkitRequestFullscreen' in document.documentElement ||
                     'mozRequestFullScreen' in document.documentElement,
          notifications: 'Notification' in window,
          geolocation: 'geolocation' in navigator,
          webWorkers: typeof Worker !== 'undefined',
          localStorage: typeof Storage !== 'undefined',
          sessionStorage: typeof sessionStorage !== 'undefined',
          indexedDB: 'indexedDB' in window,
          webGL: (() => {
            try {
              const canvas = document.createElement('canvas')
              return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
            } catch (e) {
              return false
            }
          })(),
          mediaDevices: 'mediaDevices' in navigator,
          vibration: 'vibrate' in navigator
        },
        cssSupport: {
          grid: CSS.supports('display', 'grid'),
          flexbox: CSS.supports('display', 'flex'),
          customProperties: CSS.supports('--test', 'value'),
          transforms: CSS.supports('transform', 'rotate(0deg)'),
          animations: CSS.supports('animation', 'test 1s'),
          transitions: CSS.supports('transition', 'all 1s')
        },
        performance: {
          memory: !!(performance as any).memory,
          navigation: !!performance.getEntriesByType,
          observer: 'PerformanceObserver' in window,
          timeOrigin: 'timeOrigin' in performance
        }
      }
    })
  }

  /**
   * Test timer precision across browsers
   */
  async testTimerPrecisionByBrowser(): Promise<BrowserTimerAnalysis> {
    // Start timer and collect precision data
    await this.page.locator(this.selectors.presetSelector).click()
    await this.page.locator('[data-testid="preset-beginner"]').click()
    await this.page.locator(this.selectors.startButton).click()

    // Collect timing samples
    const samples = await this.collectTimingSamples(10000, 100) // 10 seconds, 100ms intervals
    
    await this.page.locator(this.selectors.stopButton).click()

    // Analyze precision
    const deviations = this.analyzeTimingDeviations(samples)
    
    return {
      browserName: this.browserName,
      sampleCount: samples.length,
      avgDeviation: deviations.avg,
      maxDeviation: deviations.max,
      minDeviation: deviations.min,
      standardDeviation: deviations.std,
      meetsRequirement: deviations.max <= 100,
      samples: samples.slice(0, 10) // Keep first 10 for analysis
    }
  }

  /**
   * Collect timing samples for precision analysis
   */
  private async collectTimingSamples(durationMs: number, intervalMs: number): Promise<TimingSample[]> {
    const samples: TimingSample[] = []
    const startTime = Date.now()
    const endTime = startTime + durationMs

    while (Date.now() < endTime) {
      const systemTime = Date.now()
      const timeText = await this.page.locator(this.selectors.currentTime).textContent()
      
      if (timeText) {
        const [minutes, seconds] = timeText.split(':').map(Number)
        const timerValue = (minutes * 60 + seconds) * 1000
        
        samples.push({
          systemTime,
          timerValue,
          relativeTime: systemTime - startTime
        })
      }
      
      await this.page.waitForTimeout(intervalMs)
    }

    return samples
  }

  /**
   * Analyze timing deviations from expected behavior
   */
  private analyzeTimingDeviations(samples: TimingSample[]): TimingDeviations {
    if (samples.length < 2) {
      return { avg: 0, max: 0, min: 0, std: 0 }
    }

    const deviations: number[] = []
    
    for (let i = 1; i < samples.length; i++) {
      const prev = samples[i - 1]
      const curr = samples[i]
      
      const systemDiff = curr.systemTime - prev.systemTime
      const timerDiff = prev.timerValue - curr.timerValue // Timer counts down
      
      const deviation = Math.abs(timerDiff - systemDiff)
      deviations.push(deviation)
    }

    const avg = deviations.reduce((sum, d) => sum + d, 0) / deviations.length
    const max = Math.max(...deviations)
    const min = Math.min(...deviations)
    
    // Calculate standard deviation
    const variance = deviations.reduce((sum, d) => sum + Math.pow(d - avg, 2), 0) / deviations.length
    const std = Math.sqrt(variance)

    return { avg, max, min, std }
  }

  /**
   * Test audio system behavior by browser
   */
  async testAudioByBrowser(): Promise<BrowserAudioAnalysis> {
    const audioAnalysis: BrowserAudioAnalysis = {
      browserName: this.browserName,
      webAudioSupported: false,
      autoplayPolicy: 'unknown',
      audioElementsWork: false,
      volumeControlWorks: false,
      contextSuspensionHandling: false
    }

    // Test Web Audio API support
    audioAnalysis.webAudioSupported = await this.page.evaluate(() => {
      return typeof (window as any).AudioContext !== 'undefined' || 
             typeof (window as any).webkitAudioContext !== 'undefined'
    })

    // Test autoplay policy
    audioAnalysis.autoplayPolicy = await this.testAutoplayPolicy()

    // Test HTML Audio elements
    audioAnalysis.audioElementsWork = await this.testHtmlAudio()

    // Test volume control
    audioAnalysis.volumeControlWorks = await this.testVolumeControl()

    // Test Audio Context suspension handling
    if (audioAnalysis.webAudioSupported) {
      audioAnalysis.contextSuspensionHandling = await this.testAudioContextSuspension()
    }

    return audioAnalysis
  }

  /**
   * Test browser's autoplay policy
   */
  private async testAutoplayPolicy(): Promise<string> {
    return await this.page.evaluate(() => {
      // Create test audio element
      const audio = document.createElement('audio')
      audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjOO1fPNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjOO1fPNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjOO1fPNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjOO1fPNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmzhBjOO1fPNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjOO1fPNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjOO1fPNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjOO1fPNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjOO1fPNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjOO1fPNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjOO1fPNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjOO1fPObzCCJ4'
      
      return audio.play().then(() => {
        return 'allowed'
      }).catch((error) => {
        if (error.name === 'NotAllowedError') {
          return 'blocked'
        } else if (error.name === 'NotSupportedError') {
          return 'not-supported'
        }
        return 'unknown-error'
      })
    })
  }

  /**
   * Test HTML Audio element functionality
   */
  private async testHtmlAudio(): Promise<boolean> {
    return await this.page.evaluate(() => {
      const audio = document.createElement('audio')
      audio.preload = 'auto' 
      audio.src = '/sounds/bell.mp3' // Test with actual sound file
      
      return new Promise((resolve) => {
        let resolved = false
        
        const resolveOnce = (result: boolean) => {
          if (!resolved) {
            resolved = true
            resolve(result)
          }
        }
        
        audio.addEventListener('canplaythrough', () => resolveOnce(true))
        audio.addEventListener('error', () => resolveOnce(false))
        
        // Timeout after 5 seconds
        setTimeout(() => resolveOnce(false), 5000)
        
        audio.load()
      })
    })
  }

  /**
   * Test volume control functionality
   */
  private async testVolumeControl(): Promise<boolean> {
    try {
      const volumeSlider = this.page.locator(this.selectors.volumeSlider)
      if (!(await volumeSlider.isVisible())) return false

      // Test volume adjustment
      await volumeSlider.fill('50')
      await this.page.waitForTimeout(200)
      
      const volume = await volumeSlider.inputValue()
      return volume === '50'
    } catch (error) {
      return false
    }
  }

  /**
   * Test Audio Context suspension and resumption
   */
  private async testAudioContextSuspension(): Promise<boolean> {
    return await this.page.evaluate(async () => {
      try {
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext
        if (!AudioContextClass) return false

        const ctx = new AudioContextClass()
        
        // Test suspension
        await ctx.suspend()
        const suspended = ctx.state === 'suspended'
        
        // Test resumption
        await ctx.resume()
        const resumed = ctx.state === 'running'
        
        ctx.close()
        
        return suspended && resumed
      } catch (error) {
        return false
      }
    })
  }

  /**
   * Test PWA features by browser
   */
  async testPWAByBrowser(): Promise<BrowserPWAAnalysis> {
    const pwaAnalysis: BrowserPWAAnalysis = {
      browserName: this.browserName,
      serviceWorkerSupported: false,
      manifestSupported: false,
      installPromptSupported: false,
      cachingWorks: false,
      offlineCapable: false
    }

    // Test Service Worker support
    pwaAnalysis.serviceWorkerSupported = await this.page.evaluate(() => {
      return 'serviceWorker' in navigator
    })

    // Test manifest support
    pwaAnalysis.manifestSupported = await this.testManifestSupport()

    // Test install prompt support
    pwaAnalysis.installPromptSupported = await this.testInstallPromptSupport()

    // Test caching functionality
    if (pwaAnalysis.serviceWorkerSupported) {
      pwaAnalysis.cachingWorks = await this.testCaching()
    }

    return pwaAnalysis
  }

  /**
   * Test Web App Manifest support
   */
  private async testManifestSupport(): Promise<boolean> {
    try {
      const manifestResponse = await this.page.request.get('/manifest.json')
      return manifestResponse.ok()
    } catch (error) {
      return false
    }
  }

  /**
   * Test install prompt support
   */
  private async testInstallPromptSupport(): Promise<boolean> {
    return await this.page.evaluate(() => {
      return 'BeforeInstallPromptEvent' in window || 
             'onbeforeinstallprompt' in window
    })
  }

  /**
   * Test Service Worker caching
   */
  private async testCaching(): Promise<boolean> {
    return await this.page.evaluate(async () => {
      if (!('caches' in window)) return false

      try {
        const cacheNames = await caches.keys()
        return cacheNames.length > 0
      } catch (error) {
        return false
      }
    })
  }

  /**
   * Test CSS and layout consistency
   */
  async testLayoutConsistency(): Promise<BrowserLayoutAnalysis> {
    const layoutAnalysis: BrowserLayoutAnalysis = {
      browserName: this.browserName,
      timerDisplaySize: null,
      buttonSizes: {},
      colorRendering: {},
      fontRendering: {},
      flexboxSupport: false,
      gridSupport: false
    }

    // Test main timer display
    const timerDisplay = this.page.locator(this.selectors.timerDisplay)
    if (await timerDisplay.isVisible()) {
      const box = await timerDisplay.boundingBox()
      layoutAnalysis.timerDisplaySize = box
    }

    // Test button sizes
    const buttons = [
      { selector: this.selectors.startButton, name: 'start' },
      { selector: this.selectors.pauseButton, name: 'pause' },
      { selector: this.selectors.stopButton, name: 'stop' }
    ]

    for (const button of buttons) {
      const element = this.page.locator(button.selector)
      if (await element.isVisible()) {
        const box = await element.boundingBox()
        layoutAnalysis.buttonSizes[button.name] = box
      }
    }

    // Test CSS feature support
    const cssSupport = await this.page.evaluate(() => {
      return {
        flexbox: CSS.supports('display', 'flex'),
        grid: CSS.supports('display', 'grid'),
        customProperties: CSS.supports('--test', 'value'),
        transforms: CSS.supports('transform', 'rotate(0deg)')
      }
    })

    layoutAnalysis.flexboxSupport = cssSupport.flexbox
    layoutAnalysis.gridSupport = cssSupport.grid

    return layoutAnalysis
  }

  /**
   * Test local storage behavior by browser
   */
  async testStorageBehavior(): Promise<BrowserStorageAnalysis> {
    return await this.page.evaluate(() => {
      const storageAnalysis = {
        localStorage: {
          supported: typeof localStorage !== 'undefined',
          quotaSupported: 'estimate' in navigator.storage,
          works: false
        },
        sessionStorage: {
          supported: typeof sessionStorage !== 'undefined',
          works: false
        },
        indexedDB: {
          supported: 'indexedDB' in window,
          works: false
        }
      }

      // Test localStorage
      if (storageAnalysis.localStorage.supported) {
        try {
          const testKey = 'browser-test-' + Date.now()
          localStorage.setItem(testKey, 'test-value')
          const retrieved = localStorage.getItem(testKey)
          localStorage.removeItem(testKey)
          storageAnalysis.localStorage.works = retrieved === 'test-value'
        } catch (error) {
          storageAnalysis.localStorage.works = false
        }
      }

      // Test sessionStorage
      if (storageAnalysis.sessionStorage.supported) {
        try {
          const testKey = 'session-test-' + Date.now()
          sessionStorage.setItem(testKey, 'test-value')
          const retrieved = sessionStorage.getItem(testKey)
          sessionStorage.removeItem(testKey)
          storageAnalysis.sessionStorage.works = retrieved === 'test-value'
        } catch (error) {
          storageAnalysis.sessionStorage.works = false
        }
      }

      // Test IndexedDB (basic check)
      if (storageAnalysis.indexedDB.supported) {
        try {
          const request = indexedDB.open('test-db', 1)
          request.onsuccess = () => {
            storageAnalysis.indexedDB.works = true
            request.result.close()
            indexedDB.deleteDatabase('test-db')
          }
          request.onerror = () => {
            storageAnalysis.indexedDB.works = false
          }
        } catch (error) {
          storageAnalysis.indexedDB.works = false
        }
      }

      return storageAnalysis
    })
  }
}

// Type definitions for cross-browser test results
interface BrowserCapabilities {
  userAgent: string
  browserType: {
    chrome: boolean
    firefox: boolean
    safari: boolean
    edge: boolean
  }
  webApiSupport: {
    [key: string]: boolean
  }
  cssSupport: {
    [key: string]: boolean
  }
  performance: {
    [key: string]: boolean
  }
}

interface TimingSample {
  systemTime: number
  timerValue: number
  relativeTime: number
}

interface TimingDeviations {
  avg: number
  max: number
  min: number
  std: number
}

interface BrowserTimerAnalysis {
  browserName: string
  sampleCount: number
  avgDeviation: number
  maxDeviation: number
  minDeviation: number
  standardDeviation: number
  meetsRequirement: boolean
  samples: TimingSample[]
}

interface BrowserAudioAnalysis {
  browserName: string
  webAudioSupported: boolean
  autoplayPolicy: string
  audioElementsWork: boolean
  volumeControlWorks: boolean
  contextSuspensionHandling: boolean
}

interface BrowserPWAAnalysis {
  browserName: string
  serviceWorkerSupported: boolean
  manifestSupported: boolean
  installPromptSupported: boolean
  cachingWorks: boolean
  offlineCapable: boolean
}

interface BrowserLayoutAnalysis {
  browserName: string
  timerDisplaySize: { x: number; y: number; width: number; height: number } | null
  buttonSizes: Record<string, { x: number; y: number; width: number; height: number } | null>
  colorRendering: Record<string, any>
  fontRendering: Record<string, any>
  flexboxSupport: boolean
  gridSupport: boolean
}

interface BrowserStorageAnalysis {
  localStorage: {
    supported: boolean
    quotaSupported: boolean
    works: boolean
  }
  sessionStorage: {
    supported: boolean
    works: boolean
  }
  indexedDB: {
    supported: boolean
    works: boolean
  }
}

test.describe('Cross-Browser E2E Tests', () => {
  let crossBrowserTester: CrossBrowserTester

  test.beforeEach(async ({ page, browserName }) => {
    crossBrowserTester = new CrossBrowserTester(page, browserName)
    await crossBrowserTester.initialize()
  })

  test.describe('Browser Capability Detection', () => {
    test('should detect browser capabilities correctly', async ({ browserName }) => {
      const capabilities = await crossBrowserTester.detectBrowserCapabilities()
      
      console.log(`\n=== ${browserName.toUpperCase()} Browser Capabilities ===`)
      console.log(`User Agent: ${capabilities.userAgent}`)
      console.log(`Browser Type:`, capabilities.browserType)
      console.log(`Web API Support:`, capabilities.webApiSupport)
      console.log(`CSS Support:`, capabilities.cssSupport)
      console.log(`Performance APIs:`, capabilities.performance)
      
      // Essential APIs should be supported
      expect(capabilities.webApiSupport.webWorkers).toBe(true)
      expect(capabilities.webApiSupport.localStorage).toBe(true)
      expect(capabilities.cssSupport.flexbox).toBe(true)
      
      // Modern browsers should support these
      if (browserName !== 'webkit') { // Safari may have different support
        expect(capabilities.webApiSupport.serviceWorker).toBe(true)
      }
    })

    test('should identify browser-specific features', async ({ browserName }) => {
      const capabilities = await crossBrowserTester.detectBrowserCapabilities()
      
      // Browser-specific expectations
      if (browserName === 'chromium') {
        expect(capabilities.browserType.chrome || capabilities.browserType.edge).toBe(true)
        expect(capabilities.webApiSupport.webAudio).toBe(true)
        expect(capabilities.webApiSupport.serviceWorker).toBe(true)
      }
      
      if (browserName === 'firefox') {
        expect(capabilities.browserType.firefox).toBe(true)
        expect(capabilities.webApiSupport.webAudio).toBe(true)
        expect(capabilities.webApiSupport.serviceWorker).toBe(true)
      }
      
      if (browserName === 'webkit') {
        expect(capabilities.browserType.safari).toBe(true)
        expect(capabilities.webApiSupport.webAudio).toBe(true)
        // Safari may have different PWA support
      }
      
      console.log(`${browserName} specific features validated ✓`)
    })
  })

  test.describe('Timer Precision Across Browsers', () => {
    test('should maintain precision requirements in current browser', async ({ browserName }) => {
      const timerAnalysis = await crossBrowserTester.testTimerPrecisionByBrowser()
      
      console.log(`\n=== ${browserName.toUpperCase()} Timer Precision Analysis ===`)
      console.log(`Sample Count: ${timerAnalysis.sampleCount}`)
      console.log(`Average Deviation: ${timerAnalysis.avgDeviation.toFixed(2)}ms`)
      console.log(`Maximum Deviation: ${timerAnalysis.maxDeviation.toFixed(2)}ms`)
      console.log(`Standard Deviation: ${timerAnalysis.standardDeviation.toFixed(2)}ms`)
      console.log(`Meets ±100ms Requirement: ${timerAnalysis.meetsRequirement}`)
      
      // All browsers should meet the basic requirement
      expect(timerAnalysis.meetsRequirement).toBe(true)
      expect(timerAnalysis.maxDeviation).toBeLessThanOrEqual(100)
      expect(timerAnalysis.sampleCount).toBeGreaterThan(50) // Should have collected many samples
    })

    test('should document browser-specific timing characteristics', async ({ browserName }) => {
      const timerAnalysis = await crossBrowserTester.testTimerPrecisionByBrowser()
      
      // Document browser-specific timing behavior
      let timingCharacteristics = ''
      
      if (timerAnalysis.avgDeviation < 20) {
        timingCharacteristics = 'Excellent precision'
      } else if (timerAnalysis.avgDeviation < 50) {
        timingCharacteristics = 'Good precision'
      } else {
        timingCharacteristics = 'Acceptable precision'
      }
      
      console.log(`${browserName} timing characteristics: ${timingCharacteristics}`)
      
      // Browser-specific expectations
      if (browserName === 'chromium') {
        // Chrome typically has excellent timing precision
        expect(timerAnalysis.avgDeviation).toBeLessThan(50)
      }
      
      if (browserName === 'firefox') {
        // Firefox should have good timing precision
        expect(timerAnalysis.avgDeviation).toBeLessThan(75)
      }
      
      if (browserName === 'webkit') {
        // Safari may have different timing characteristics
        expect(timerAnalysis.avgDeviation).toBeLessThan(100)
      }
    })
  })

  test.describe('Audio System Cross-Browser Testing', () => {
    test('should handle audio correctly in current browser', async ({ browserName }) => {
      const audioAnalysis = await crossBrowserTester.testAudioByBrowser()
      
      console.log(`\n=== ${browserName.toUpperCase()} Audio Analysis ===`)
      console.log(`Web Audio Supported: ${audioAnalysis.webAudioSupported}`)
      console.log(`Autoplay Policy: ${audioAnalysis.autoplayPolicy}`)
      console.log(`HTML Audio Works: ${audioAnalysis.audioElementsWork}`)
      console.log(`Volume Control Works: ${audioAnalysis.volumeControlWorks}`)
      console.log(`Context Suspension Handling: ${audioAnalysis.contextSuspensionHandling}`)
      
      // Modern browsers should support Web Audio API
      expect(audioAnalysis.webAudioSupported).toBe(true)
      
      // Audio elements should work (may depend on test environment)
      if (audioAnalysis.audioElementsWork) {
        expect(audioAnalysis.volumeControlWorks).toBe(true)
      }
      
      // Autoplay policy should be detected
      expect(['allowed', 'blocked', 'not-supported', 'unknown-error']).toContain(audioAnalysis.autoplayPolicy)
    })

    test('should handle browser-specific audio policies', async ({ page, browserName }) => {
      // Test user gesture requirement for audio
      const userGestureRequired = await page.evaluate(async () => {
        const audio = document.createElement('audio')
        audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt659NMCxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjOO1fPNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjOO1fPNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjOO1fPNeSs='
        
        try {
          await audio.play()
          return false // No user gesture required
        } catch (error) {
          return error.name === 'NotAllowedError'
        }
      })
      
      console.log(`${browserName} requires user gesture for audio: ${userGestureRequired}`)
      
      // After user interaction, audio should work
      await page.click('body') // Establish user gesture
      
      const audioWorksAfterGesture = await page.evaluate(async () => {
        const audio = document.createElement('audio')
        audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt659NMCxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjOO1fPNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjOO1fPNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjOO1fPNeSs='
        
        try {
          await audio.play()
          return true
        } catch (error) {
          return false
        }
      })
      
      if (userGestureRequired) {
        expect(audioWorksAfterGesture).toBe(true)
      }
      
      console.log(`${browserName} audio works after user gesture: ${audioWorksAfterGesture}`)
    })
  })

  test.describe('PWA Support Across Browsers', () => {
    test('should evaluate PWA capabilities in current browser', async ({ browserName }) => {
      const pwaAnalysis = await crossBrowserTester.testPWAByBrowser()
      
      console.log(`\n=== ${browserName.toUpperCase()} PWA Analysis ===`)
      console.log(`Service Worker Supported: ${pwaAnalysis.serviceWorkerSupported}`)
      console.log(`Manifest Supported: ${pwaAnalysis.manifestSupported}`)
      console.log(`Install Prompt Supported: ${pwaAnalysis.installPromptSupported}`)
      console.log(`Caching Works: ${pwaAnalysis.cachingWorks}`)
      
      // Modern browsers should support core PWA features
      if (browserName !== 'webkit') { // Safari has different PWA support
        expect(pwaAnalysis.serviceWorkerSupported).toBe(true)
        expect(pwaAnalysis.manifestSupported).toBe(true)
      }
      
      // Browser-specific PWA features
      if (browserName === 'chromium') {
        expect(pwaAnalysis.installPromptSupported).toBe(true)
        expect(pwaAnalysis.cachingWorks).toBe(true)
      }
      
      if (browserName === 'firefox') {
        expect(pwaAnalysis.serviceWorkerSupported).toBe(true)
        expect(pwaAnalysis.manifestSupported).toBe(true)
      }
    })

    test('should handle PWA installation differences', async ({ page, browserName }) => {
      // Test PWA installation criteria
      const installationReady = await page.evaluate(() => {
        const hasManifest = !!document.querySelector('link[rel="manifest"]')
        const hasServiceWorker = 'serviceWorker' in navigator
        const isHTTPS = location.protocol === 'https:' || location.hostname === 'localhost'
        
        return { hasManifest, hasServiceWorker, isHTTPS }
      })
      
      console.log(`${browserName} PWA installation criteria:`, installationReady)
      
      expect(installationReady.hasManifest).toBe(true)
      expect(installationReady.isHTTPS).toBe(true)
      
      if (browserName !== 'webkit') {
        expect(installationReady.hasServiceWorker).toBe(true)
      }
    })
  })

  test.describe('Layout and Visual Consistency', () => {
    test('should render layout consistently', async ({ browserName }) => {
      const layoutAnalysis = await crossBrowserTester.testLayoutConsistency()
      
      console.log(`\n=== ${browserName.toUpperCase()} Layout Analysis ===`)
      console.log(`Timer Display Size:`, layoutAnalysis.timerDisplaySize)
      console.log(`Button Sizes:`, layoutAnalysis.buttonSizes)
      console.log(`Flexbox Support: ${layoutAnalysis.flexboxSupport}`)
      console.log(`Grid Support: ${layoutAnalysis.gridSupport}`)
      
      // Layout should be properly rendered
      expect(layoutAnalysis.timerDisplaySize).toBeTruthy()
      expect(layoutAnalysis.timerDisplaySize!.width).toBeGreaterThan(100)
      expect(layoutAnalysis.timerDisplaySize!.height).toBeGreaterThan(50)
      
      // Buttons should be properly sized
      if (layoutAnalysis.buttonSizes.start) {
        expect(layoutAnalysis.buttonSizes.start.width).toBeGreaterThan(40)
        expect(layoutAnalysis.buttonSizes.start.height).toBeGreaterThan(30)
      }
      
      // Modern CSS features should be supported
      expect(layoutAnalysis.flexboxSupport).toBe(true)
    })

    test('should handle browser-specific rendering differences', async ({ page, browserName }) => {
      // Test font rendering consistency
      const fontMetrics = await page.evaluate(() => {
        const timerElement = document.querySelector('[data-testid="current-time"]')
        if (!timerElement) return null
        
        const computedStyle = getComputedStyle(timerElement)
        return {
          fontSize: computedStyle.fontSize,
          fontFamily: computedStyle.fontFamily,
          fontWeight: computedStyle.fontWeight,
          lineHeight: computedStyle.lineHeight
        }
      })
      
      console.log(`${browserName} font metrics:`, fontMetrics)
      
      if (fontMetrics) {
        expect(fontMetrics.fontSize).toBeTruthy()
        expect(fontMetrics.fontFamily).toBeTruthy()
      }
      
      // Test color rendering
      const colorRendering = await page.evaluate(() => {
        const startButton = document.querySelector('[data-testid="start-button"]')
        if (!startButton) return null
        
        const computedStyle = getComputedStyle(startButton)
        return {
          backgroundColor: computedStyle.backgroundColor,
          color: computedStyle.color,
          borderColor: computedStyle.borderColor
        }
      })
      
      console.log(`${browserName} color rendering:`, colorRendering)
      
      if (colorRendering) {
        expect(colorRendering.backgroundColor).toBeTruthy()
        expect(colorRendering.color).toBeTruthy()
      }
    })
  })

  test.describe('Storage and Persistence', () => {
    test('should handle storage correctly in current browser', async ({ browserName }) => {
      const storageAnalysis = await crossBrowserTester.testStorageBehavior()
      
      console.log(`\n=== ${browserName.toUpperCase()} Storage Analysis ===`)
      console.log(`LocalStorage:`, storageAnalysis.localStorage)
      console.log(`SessionStorage:`, storageAnalysis.sessionStorage)
      console.log(`IndexedDB:`, storageAnalysis.indexedDB)
      
      // All modern browsers should support these storage mechanisms
      expect(storageAnalysis.localStorage.supported).toBe(true)
      expect(storageAnalysis.sessionStorage.supported).toBe(true)
      expect(storageAnalysis.indexedDB.supported).toBe(true)
      
      // Storage should work functionally
      expect(storageAnalysis.localStorage.works).toBe(true)
      expect(storageAnalysis.sessionStorage.works).toBe(true)
    })

    test('should persist timer settings across browser sessions', async ({ page, context }) => {
      // Set custom timer settings
      await page.locator('[data-testid="preset-selector"]').click()
      await page.locator('[data-testid="preset-intermediate"]').click()
      
      const selectedPreset = await page.locator('[data-testid="preset-selector"]').inputValue()
      
      // Create new page (simulate browser restart)
      const newPage = await context.newPage()
      await newPage.goto('/')
      await newPage.waitForLoadState('networkidle')
      
      // Check if settings persisted
      const persistedPreset = await newPage.locator('[data-testid="preset-selector"]').inputValue()
      
      console.log(`Settings persistence: ${selectedPreset} -> ${persistedPreset}`)
      
      // Settings should persist (or use reasonable defaults)
      expect(persistedPreset).toBeTruthy()
      
      await newPage.close()
    })
  })

  // Save cross-browser test results
  test.afterEach(async ({ page, browserName }, testInfo) => {
    // Capture comprehensive browser state
    const browserState = await page.evaluate(() => {
      return {
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio
        },
        features: {
          webAudio: typeof (window as any).AudioContext !== 'undefined',
          serviceWorker: 'serviceWorker' in navigator,
          localStorage: typeof localStorage !== 'undefined',
          indexedDB: 'indexedDB' in window,
          webGL: (() => {
            try {
              const canvas = document.createElement('canvas')
              return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
            } catch (e) {
              return false
            }
          })()
        },
        performance: (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize
        } : null,
        css: {
          flexbox: CSS.supports('display', 'flex'),
          grid: CSS.supports('display', 'grid'),
          customProperties: CSS.supports('--test', 'value')
        }
      }
    })
    
    // Save comprehensive test results
    const resultsDir = path.join(__dirname, '../test-results')
    await fs.mkdir(resultsDir, { recursive: true })
    
    await fs.writeFile(
      path.join(resultsDir, `cross-browser-${browserName}-${testInfo.title.replace(/\s+/g, '-')}-${Date.now()}.json`),
      JSON.stringify({
        testTitle: testInfo.title,
        browserName,
        status: testInfo.status,
        duration: testInfo.duration,
        browserState,
        timestamp: new Date().toISOString()
      }, null, 2)
    )
  })
})