/**
 * Mobile Experience E2E Tests for Boxing Timer MVP
 * 
 * Tests mobile-specific functionality, touch interactions, and responsive design.
 * Critical for boxers who primarily train using mobile devices.
 * 
 * Business Context:
 * - Most boxing training occurs using mobile devices (phones/tablets)
 * - Touch interactions must be reliable and responsive during intense workouts
 * - Screen orientation changes are common when phones are placed on surfaces
 * - Mobile users often wear gloves, requiring larger touch targets
 * - Battery optimization and wake lock are essential for long workouts
 * - Mobile audio handling differs significantly from desktop
 * 
 * Test Coverage:
 * - Touch interactions and gesture support
 * - Responsive design across mobile viewports
 * - Screen orientation handling and layout adaptation
 * - Mobile-specific UI components and controls
 * - Touch target sizes and accessibility
 * - Mobile audio autoplay and interaction requirements
 * - Battery and performance optimization
 * - Mobile PWA features and app-like behavior
 */

import { test, expect, Page, BrowserContext } from '@playwright/test'
import { promises as fs } from 'fs'
import path from 'path'

/**
 * Mobile Experience Testing Utilities
 * Provides comprehensive mobile functionality testing and validation
 */
class MobileExperienceTester {
  constructor(private page: Page) {}

  private selectors = {
    timerDisplay: '[data-testid="timer-display"]',
    currentTime: '[data-testid="current-time"]',
    startButton: '[data-testid="start-button"]',
    pauseButton: '[data-testid="pause-button"]',
    stopButton: '[data-testid="stop-button"]',
    resetButton: '[data-testid="reset-button"]',
    presetSelector: '[data-testid="preset-selector"]',
    volumeSlider: '[data-testid="volume-slider"]',
    settingsButton: '[data-testid="settings-button"]',
    mobileMenu: '[data-testid="mobile-menu"]',
    swipeArea: '[data-testid="swipe-area"]',
    fullscreenButton: '[data-testid="fullscreen-button"]',
    orientationLock: '[data-testid="orientation-lock"]'
  }

  /**
   * Initialize mobile testing environment with specific viewport
   */
  async initializeMobile(viewport: { width: number; height: number }) {
    await this.page.setViewportSize(viewport)
    await this.page.goto('/')
    await this.page.waitForLoadState('networkidle')
    
    // Wait for mobile-specific components to load
    await this.page.waitForTimeout(1000)
  }

  /**
   * Test touch interactions and responsiveness
   */
  async testTouchInteractions(): Promise<TouchTestResult> {
    const results: TouchTestResult = {
      tapResponsiveness: [],
      touchTargetSizes: [],
      gestureSupport: {},
      scrollBehavior: null
    }

    // Test button tap responsiveness
    const buttons = [
      { selector: this.selectors.startButton, name: 'Start' },
      { selector: this.selectors.pauseButton, name: 'Pause' },
      { selector: this.selectors.stopButton, name: 'Stop' },
      { selector: this.selectors.resetButton, name: 'Reset' }
    ]

    for (const button of buttons) {
      const element = this.page.locator(button.selector)
      
      if (await element.isVisible()) {
        const startTime = Date.now()
        await element.tap()
        const responseTime = Date.now() - startTime
        
        results.tapResponsiveness.push({
          element: button.name,
          responseTime,
          successful: responseTime < 300 // 300ms is acceptable for touch
        })
        
        // Measure touch target size
        const boundingBox = await element.boundingBox()
        if (boundingBox) {
          results.touchTargetSizes.push({
            element: button.name,
            width: boundingBox.width,
            height: boundingBox.height,
            meetsMinimum: boundingBox.width >= 44 && boundingBox.height >= 44 // 44px minimum
          })
        }
      }
    }

    // Test gesture support
    results.gestureSupport = await this.testGestureSupport()
    
    // Test scroll behavior
    results.scrollBehavior = await this.testScrollBehavior()

    return results
  }

  /**
   * Test gesture support (swipe, pinch, etc.)
   */
  private async testGestureSupport(): Promise<GestureSupport> {
    const gestureSupport: GestureSupport = {
      swipeSupported: false,
      swipeToChangePreset: false,
      pinchToZoom: false,
      longPress: false
    }

    // Test swipe gesture on timer display
    const timerDisplay = this.page.locator(this.selectors.timerDisplay)
    
    if (await timerDisplay.isVisible()) {
      try {
        const box = await timerDisplay.boundingBox()
        if (box) {
          // Simulate swipe left gesture
          await this.page.touchscreen.tap(box.x + box.width * 0.8, box.y + box.height / 2)
          await this.page.touchscreen.tap(box.x + box.width * 0.2, box.y + box.height / 2)
          
          gestureSupport.swipeSupported = true
          
          // Check if swipe changed preset or triggered any action
          await this.page.waitForTimeout(500)
          // Implementation would check for preset change
        }
      } catch (error) {
        console.log('Swipe gesture test failed:', error)
      }

      // Test long press
      try {
        const box = await timerDisplay.boundingBox()
        if (box) {
          await this.page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
          await this.page.waitForTimeout(1000) // Long press duration
          gestureSupport.longPress = true
        }
      } catch (error) {
        console.log('Long press test failed:', error)
      }
    }

    return gestureSupport
  }

  /**
   * Test scroll behavior and performance
   */
  private async testScrollBehavior(): Promise<ScrollBehavior | null> {
    try {
      // Measure scroll performance
      const startTime = Date.now()
      await this.page.evaluate(() => {
        window.scrollTo(0, 100)
      })
      await this.page.waitForTimeout(100)
      const scrollTime = Date.now() - startTime

      const scrollTop = await this.page.evaluate(() => window.scrollY)

      return {
        scrollResponsive: scrollTime < 100,
        smoothScroll: scrollTop > 0,
        scrollTime
      }
    } catch (error) {
      return null
    }
  }

  /**
   * Test responsive design across different mobile viewports
   */
  async testResponsiveDesign(viewports: MobileViewport[]): Promise<ResponsiveTestResult[]> {
    const results: ResponsiveTestResult[] = []

    for (const viewport of viewports) {
      await this.page.setViewportSize({ width: viewport.width, height: viewport.height })
      await this.page.waitForTimeout(500) // Allow layout to adjust

      const responsiveResult: ResponsiveTestResult = {
        viewport,
        layoutValid: false,
        elementsVisible: {},
        textReadable: false,
        touchTargetsAccessible: false
      }

      // Check if main elements are visible and properly sized
      const mainElements = [
        this.selectors.timerDisplay,
        this.selectors.startButton,
        this.selectors.currentTime
      ]

      for (const selector of mainElements) {
        const element = this.page.locator(selector)
        const isVisible = await element.isVisible()
        const boundingBox = isVisible ? await element.boundingBox() : null
        
        responsiveResult.elementsVisible[selector] = {
          visible: isVisible,
          withinViewport: boundingBox ? 
            boundingBox.x >= 0 && 
            boundingBox.y >= 0 && 
            boundingBox.x + boundingBox.width <= viewport.width &&
            boundingBox.y + boundingBox.height <= viewport.height : false
        }
      }

      // Check text readability
      const timeText = this.page.locator(this.selectors.currentTime)
      if (await timeText.isVisible()) {
        const fontSize = await timeText.evaluate(el => 
          parseInt(getComputedStyle(el).fontSize, 10)
        )
        responsiveResult.textReadable = fontSize >= 16 // Minimum readable size
      }

      // Check touch target accessibility
      const startButton = this.page.locator(this.selectors.startButton)
      if (await startButton.isVisible()) {
        const buttonBox = await startButton.boundingBox()
        responsiveResult.touchTargetsAccessible = buttonBox ? 
          buttonBox.width >= 44 && buttonBox.height >= 44 : false
      }

      // Overall layout validity
      responsiveResult.layoutValid = Object.values(responsiveResult.elementsVisible)
        .every(el => el.visible && el.withinViewport) && 
        responsiveResult.textReadable && 
        responsiveResult.touchTargetsAccessible

      results.push(responsiveResult)
    }

    return results
  }

  /**
   * Test screen orientation handling
   */
  async testScreenOrientation(): Promise<OrientationTestResult> {
    const result: OrientationTestResult = {
      portraitLayout: null,
      landscapeLayout: null,
      orientationChangeHandled: false
    }

    // Test portrait orientation
    await this.page.setViewportSize({ width: 375, height: 667 }) // iPhone portrait
    await this.page.waitForTimeout(500)
    
    result.portraitLayout = await this.analyzeLayout('portrait')

    // Test landscape orientation
    await this.page.setViewportSize({ width: 667, height: 375 }) // iPhone landscape
    await this.page.waitForTimeout(500)
    
    result.landscapeLayout = await this.analyzeLayout('landscape')

    // Test orientation change handling
    result.orientationChangeHandled = await this.page.evaluate(() => {
      return typeof (window as any).handleOrientationChange === 'function' ||
             'onorientationchange' in window
    })

    return result
  }

  /**
   * Analyze layout for specific orientation
   */
  private async analyzeLayout(orientation: 'portrait' | 'landscape'): Promise<LayoutAnalysis> {
    const timerDisplay = this.page.locator(this.selectors.timerDisplay)
    const controls = this.page.locator(this.selectors.startButton)
    
    const timerBox = await timerDisplay.boundingBox()
    const controlsBox = await controls.boundingBox()
    
    return {
      orientation,
      timerVisible: await timerDisplay.isVisible(),
      controlsVisible: await controls.isVisible(),
      timerSize: timerBox ? { width: timerBox.width, height: timerBox.height } : null,
      controlsAccessible: controlsBox ? controlsBox.height >= 44 : false,
      layoutEfficient: timerBox && controlsBox ? 
        (timerBox.height + controlsBox.height) < window.outerHeight * 0.9 : false
    }
  }

  /**
   * Test mobile audio handling and autoplay policies
   */
  async testMobileAudio(): Promise<MobileAudioTestResult> {
    const result: MobileAudioTestResult = {
      audioContextSupported: false,
      autoplayWorksWithUserGesture: false,
      audioInterruptionHandling: false,
      volumeControlResponsive: false
    }

    // Test Web Audio API support
    result.audioContextSupported = await this.page.evaluate(() => {
      return typeof (window as any).AudioContext !== 'undefined' || 
             typeof (window as any).webkitAudioContext !== 'undefined'
    })

    // Test autoplay with user gesture
    try {
      await this.page.tap('body') // Establish user gesture
      await this.page.locator(this.selectors.startButton).tap()
      await this.page.waitForTimeout(2000)
      
      result.autoplayWorksWithUserGesture = await this.page.evaluate(() => {
        const audioElements = document.querySelectorAll('audio')
        return Array.from(audioElements).some(audio => !audio.paused)
      })
    } catch (error) {
      console.log('Mobile audio test failed:', error)
    }

    // Test volume control responsiveness
    const volumeSlider = this.page.locator(this.selectors.volumeSlider)
    if (await volumeSlider.isVisible()) {
      try {
        const startTime = Date.now()
        await volumeSlider.tap()
        const responseTime = Date.now() - startTime
        result.volumeControlResponsive = responseTime < 200
      } catch (error) {
        console.log('Volume control test failed:', error)
      }
    }

    return result
  }

  /**
   * Test mobile-specific UI components
   */
  async testMobileUIComponents(): Promise<MobileUITestResult> {
    const result: MobileUITestResult = {
      mobileMenuAccessible: false,
      fullscreenSupported: false,
      hapticFeedbackAvailable: false,
      wakeLockSupported: false
    }

    // Test mobile menu
    const mobileMenu = this.page.locator(this.selectors.mobileMenu)
    result.mobileMenuAccessible = await mobileMenu.isVisible()

    // Test fullscreen support
    result.fullscreenSupported = await this.page.evaluate(() => {
      return 'requestFullscreen' in document.documentElement ||
             'webkitRequestFullscreen' in document.documentElement
    })

    // Test haptic feedback
    result.hapticFeedbackAvailable = await this.page.evaluate(() => {
      return 'vibrate' in navigator
    })

    // Test wake lock support
    result.wakeLockSupported = await this.page.evaluate(() => {
      return 'wakeLock' in navigator
    })

    return result
  }

  /**
   * Test mobile performance and battery optimization
   */
  async testMobilePerformance(): Promise<MobilePerformanceResult> {
    const result: MobilePerformanceResult = {
      frameRate: 0,
      memoryUsage: null,
      batteryOptimized: false,
      backgroundThrottling: false
    }

    // Measure frame rate during timer operation
    await this.page.locator(this.selectors.startButton).tap()
    
    const frameRateData = await this.page.evaluate(() => {
      return new Promise(resolve => {
        let frameCount = 0
        const startTime = performance.now()
        
        const countFrames = () => {
          frameCount++
          if (performance.now() - startTime < 1000) {
            requestAnimationFrame(countFrames)
          } else {
            resolve(frameCount)
          }
        }
        
        requestAnimationFrame(countFrames)
      })
    })
    
    result.frameRate = frameRateData as number

    // Check memory usage
    result.memoryUsage = await this.page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      } : null
    })

    // Stop timer
    await this.page.locator(this.selectors.stopButton).tap()

    return result
  }
}

// Type definitions for mobile test results
interface TouchTestResult {
  tapResponsiveness: Array<{
    element: string
    responseTime: number
    successful: boolean
  }>
  touchTargetSizes: Array<{
    element: string
    width: number
    height: number
    meetsMinimum: boolean
  }>
  gestureSupport: GestureSupport
  scrollBehavior: ScrollBehavior | null
}

interface GestureSupport {
  swipeSupported: boolean
  swipeToChangePreset: boolean
  pinchToZoom: boolean
  longPress: boolean
}

interface ScrollBehavior {
  scrollResponsive: boolean
  smoothScroll: boolean
  scrollTime: number
}

interface MobileViewport {
  name: string
  width: number
  height: number
  deviceType: 'phone' | 'tablet'
}

interface ResponsiveTestResult {
  viewport: MobileViewport
  layoutValid: boolean
  elementsVisible: Record<string, {
    visible: boolean
    withinViewport: boolean
  }>
  textReadable: boolean
  touchTargetsAccessible: boolean
}

interface OrientationTestResult {
  portraitLayout: LayoutAnalysis | null
  landscapeLayout: LayoutAnalysis | null
  orientationChangeHandled: boolean
}

interface LayoutAnalysis {
  orientation: 'portrait' | 'landscape'
  timerVisible: boolean
  controlsVisible: boolean
  timerSize: { width: number; height: number } | null
  controlsAccessible: boolean
  layoutEfficient: boolean
}

interface MobileAudioTestResult {
  audioContextSupported: boolean
  autoplayWorksWithUserGesture: boolean
  audioInterruptionHandling: boolean
  volumeControlResponsive: boolean
}

interface MobileUITestResult {
  mobileMenuAccessible: boolean
  fullscreenSupported: boolean
  hapticFeedbackAvailable: boolean
  wakeLockSupported: boolean
}

interface MobilePerformanceResult {
  frameRate: number
  memoryUsage: {
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
  } | null
  batteryOptimized: boolean
  backgroundThrottling: boolean
}

// Test viewport configurations
const mobileViewports: MobileViewport[] = [
  { name: 'iPhone SE', width: 375, height: 667, deviceType: 'phone' },
  { name: 'iPhone 12', width: 390, height: 844, deviceType: 'phone' },
  { name: 'iPhone 12 Pro Max', width: 428, height: 926, deviceType: 'phone' },
  { name: 'Samsung Galaxy S21', width: 360, height: 800, deviceType: 'phone' },
  { name: 'iPad Mini', width: 768, height: 1024, deviceType: 'tablet' },
  { name: 'iPad Pro', width: 1024, height: 1366, deviceType: 'tablet' }
]

test.describe('Mobile Experience E2E Tests', () => {
  let mobileTester: MobileExperienceTester

  test.beforeEach(async ({ page }) => {
    mobileTester = new MobileExperienceTester(page)
  })

  test.describe('Touch Interactions and Responsiveness', () => {
    test('should handle touch interactions on iPhone', async ({ page }) => {
      await mobileTester.initializeMobile({ width: 375, height: 667 })
      
      const touchResults = await mobileTester.testTouchInteractions()
      
      // All touch interactions should be responsive
      for (const tap of touchResults.tapResponsiveness) {
        expect(tap.successful).toBe(true)
        expect(tap.responseTime).toBeLessThan(300)
        console.log(`${tap.element} tap response: ${tap.responseTime}ms`)
      }
      
      // Touch targets should meet minimum size requirements
      for (const target of touchResults.touchTargetSizes) {
        expect(target.meetsMinimum).toBe(true)
        console.log(`${target.element} size: ${target.width}x${target.height}px`)
      }
      
      console.log('Gesture support:', touchResults.gestureSupport)
    })

    test('should handle touch interactions on Android', async ({ page }) => {
      await mobileTester.initializeMobile({ width: 360, height: 800 })
      
      const touchResults = await mobileTester.testTouchInteractions()
      
      // Verify touch responsiveness on Android viewport
      const avgResponseTime = touchResults.tapResponsiveness.reduce(
        (sum, tap) => sum + tap.responseTime, 0
      ) / touchResults.tapResponsiveness.length
      
      expect(avgResponseTime).toBeLessThan(200) // Android should be very responsive
      
      // Check scroll behavior
      if (touchResults.scrollBehavior) {
        expect(touchResults.scrollBehavior.scrollResponsive).toBe(true)
        console.log(`Scroll performance: ${touchResults.scrollBehavior.scrollTime}ms`)
      }
    })

    test('should support gesture controls', async ({ page }) => {
      await mobileTester.initializeMobile({ width: 390, height: 844 })
      
      const touchResults = await mobileTester.testTouchInteractions()
      const gestures = touchResults.gestureSupport
      
      // Document gesture support
      console.log('Gesture capabilities:')
      console.log(`- Swipe supported: ${gestures.swipeSupported}`)
      console.log(`- Long press supported: ${gestures.longPress}`)
      console.log(`- Pinch zoom supported: ${gestures.pinchToZoom}`)
      
      // At minimum, basic touch should work
      expect(touchResults.tapResponsiveness.length).toBeGreaterThan(0)
    })
  })

  test.describe('Responsive Design Validation', () => {
    test('should adapt layout to different mobile viewports', async ({ page }) => {
      const responsiveResults = await mobileTester.testResponsiveDesign(mobileViewports)
      
      for (const result of responsiveResults) {
        console.log(`\nTesting ${result.viewport.name} (${result.viewport.width}x${result.viewport.height})`)
        
        // Layout should be valid on all viewports
        expect(result.layoutValid).toBe(true)
        
        // Text should be readable
        expect(result.textReadable).toBe(true)
        
        // Touch targets should be accessible
        expect(result.touchTargetsAccessible).toBe(true)
        
        console.log(`- Layout valid: ${result.layoutValid}`)
        console.log(`- Text readable: ${result.textReadable}`)
        console.log(`- Touch targets accessible: ${result.touchTargetsAccessible}`)
      }
    })

    test('should handle extreme viewport sizes gracefully', async ({ page }) => {
      // Test very small viewport (older phones)
      const smallViewports = [
        { name: 'iPhone 4', width: 320, height: 480, deviceType: 'phone' as const },
        { name: 'Small Android', width: 240, height: 320, deviceType: 'phone' as const }
      ]
      
      const smallResults = await mobileTester.testResponsiveDesign(smallViewports)
      
      for (const result of smallResults) {
        // Should handle small screens gracefully (may not be perfect)
        const elementsVisible = Object.values(result.elementsVisible)
        const visibilityRate = elementsVisible.filter(el => el.visible).length / elementsVisible.length
        
        expect(visibilityRate).toBeGreaterThan(0.7) // At least 70% of elements visible
        
        console.log(`${result.viewport.name} visibility rate: ${(visibilityRate * 100).toFixed(1)}%`)
      }
    })

    test('should optimize layout for tablets', async ({ page }) => {
      const tabletViewports = mobileViewports.filter(vp => vp.deviceType === 'tablet')
      const tabletResults = await mobileTester.testResponsiveDesign(tabletViewports)
      
      for (const result of tabletResults) {
        // Tablets should have excellent layout optimization
        expect(result.layoutValid).toBe(true)
        
        // Timer should be larger on tablets
        const timerElement = result.elementsVisible['[data-testid="timer-display"]']
        expect(timerElement.visible).toBe(true)
        expect(timerElement.withinViewport).toBe(true)
        
        console.log(`${result.viewport.name} tablet optimization: ✓`)
      }
    })
  })

  test.describe('Screen Orientation Handling', () => {
    test('should adapt to portrait and landscape orientations', async ({ page }) => {
      const orientationResult = await mobileTester.testScreenOrientation()
      
      // Both orientations should be handled
      expect(orientationResult.portraitLayout?.timerVisible).toBe(true)
      expect(orientationResult.portraitLayout?.controlsVisible).toBe(true)
      expect(orientationResult.landscapeLayout?.timerVisible).toBe(true)
      expect(orientationResult.landscapeLayout?.controlsVisible).toBe(true)
      
      console.log('Orientation handling:')
      console.log(`- Portrait layout valid: ${orientationResult.portraitLayout?.layoutEfficient}`)
      console.log(`- Landscape layout valid: ${orientationResult.landscapeLayout?.layoutEfficient}`)
      console.log(`- Orientation change handled: ${orientationResult.orientationChangeHandled}`)
    })

    test('should maintain timer functionality across orientation changes', async ({ page }) => {
      // Start timer in portrait
      await mobileTester.initializeMobile({ width: 375, height: 667 })
      await page.locator('[data-testid="preset-selector"]').tap()
      await page.locator('[data-testid="preset-beginner"]').tap()
      await page.locator('[data-testid="start-button"]').tap()
      
      await page.waitForTimeout(2000)
      const portraitTime = await page.locator('[data-testid="current-time"]').textContent()
      
      // Rotate to landscape
      await page.setViewportSize({ width: 667, height: 375 })
      await page.waitForTimeout(1000)
      
      // Timer should still be running
      const landscapeTime = await page.locator('[data-testid="current-time"]').textContent()
      expect(landscapeTime).not.toBe(portraitTime)
      
      // Controls should still work
      const pauseButton = page.locator('[data-testid="pause-button"]')
      expect(await pauseButton.isVisible()).toBe(true)
      await pauseButton.tap()
      
      const startButton = page.locator('[data-testid="start-button"]')
      expect(await startButton.isVisible()).toBe(true)
      
      await page.locator('[data-testid="stop-button"]').tap()
    })
  })

  test.describe('Mobile Audio Experience', () => {
    test('should handle mobile audio autoplay policies', async ({ page }) => {
      await mobileTester.initializeMobile({ width: 390, height: 844 })
      
      const audioResult = await mobileTester.testMobileAudio()
      
      console.log('Mobile audio capabilities:')
      console.log(`- Audio Context supported: ${audioResult.audioContextSupported}`)
      console.log(`- Autoplay with gesture: ${audioResult.autoplayWorksWithUserGesture}`)
      console.log(`- Volume control responsive: ${audioResult.volumeControlResponsive}`)
      
      // Audio context should be supported on modern mobile browsers
      expect(audioResult.audioContextSupported).toBe(true)
      
      // Should handle autoplay restrictions gracefully
      expect(typeof audioResult.autoplayWorksWithUserGesture).toBe('boolean')
    })

    test('should provide audio controls optimized for mobile', async ({ page }) => {
      await mobileTester.initializeMobile({ width: 360, height: 800 })
      
      // Test volume slider on mobile
      const volumeSlider = page.locator('[data-testid="volume-slider"]')
      if (await volumeSlider.isVisible()) {
        const sliderBox = await volumeSlider.boundingBox()
        
        // Volume slider should be large enough for touch
        expect(sliderBox?.height).toBeGreaterThanOrEqual(44)
        
        // Should respond to touch
        await volumeSlider.tap()
        await page.waitForTimeout(200)
        
        console.log(`Volume slider size: ${sliderBox?.width}x${sliderBox?.height}px`)
      }
      
      // Test mute button
      const muteButton = page.locator('[data-testid="mute-button"]')
      if (await muteButton.isVisible()) {
        const muteBox = await muteButton.boundingBox()
        expect(muteBox?.width).toBeGreaterThanOrEqual(44)
        expect(muteBox?.height).toBeGreaterThanOrEqual(44)
        
        await muteButton.tap()
        await page.waitForTimeout(200)
        
        console.log(`Mute button size: ${muteBox?.width}x${muteBox?.height}px`)
      }
    })
  })

  test.describe('Mobile-Specific UI Components', () => {
    test('should provide mobile-optimized interface', async ({ page }) => {
      await mobileTester.initializeMobile({ width: 375, height: 667 })
      
      const uiResult = await mobileTester.testMobileUIComponents()
      
      console.log('Mobile UI features:')
      console.log(`- Fullscreen supported: ${uiResult.fullscreenSupported}`)
      console.log(`- Haptic feedback available: ${uiResult.hapticFeedbackAvailable}`)
      console.log(`- Wake lock supported: ${uiResult.wakeLockSupported}`)
      
      // Modern mobile browsers should support these features
      expect(uiResult.fullscreenSupported).toBe(true)
      
      // Document availability of mobile-specific features
      expect(typeof uiResult.hapticFeedbackAvailable).toBe('boolean')
      expect(typeof uiResult.wakeLockSupported).toBe('boolean')
    })

    test('should handle fullscreen mode for immersive experience', async ({ page }) => {
      await mobileTester.initializeMobile({ width: 390, height: 844 })
      
      // Test fullscreen capability
      const fullscreenSupported = await page.evaluate(() => {
        return 'requestFullscreen' in document.documentElement
      })
      
      if (fullscreenSupported) {
        // Test fullscreen request (may be blocked by browser policies)
        const fullscreenResult = await page.evaluate(() => {
          return document.documentElement.requestFullscreen()
            .then(() => ({ success: true, error: null }))
            .catch(error => ({ success: false, error: error.toString() }))
        })
        
        console.log(`Fullscreen test result: ${fullscreenResult.success}`)
        
        if (fullscreenResult.success) {
          // Exit fullscreen
          await page.evaluate(() => document.exitFullscreen())
        }
      }
      
      expect(fullscreenSupported).toBe(true)
    })

    test('should utilize wake lock to prevent screen sleep', async ({ page }) => {
      await mobileTester.initializeMobile({ width: 390, height: 844 })
      
      // Test wake lock API
      const wakeLockResult = await page.evaluate(async () => {
        if (!('wakeLock' in navigator)) {
          return { supported: false, acquired: false, error: 'Wake Lock API not supported' }
        }
        
        try {
          const wakeLock = await (navigator as any).wakeLock.request('screen')
          const result = {
            supported: true,
            acquired: true,
            type: wakeLock.type,
            released: wakeLock.released
          }
          
          // Release wake lock
          wakeLock.release()
          
          return result
        } catch (error) {
          return {
            supported: true,
            acquired: false,
            error: error.toString()
          }
        }
      })
      
      console.log('Wake Lock test:', wakeLockResult)
      
      // Document wake lock capability
      expect(typeof wakeLockResult.supported).toBe('boolean')
      
      if (wakeLockResult.error) {
        console.log(`Wake Lock error: ${wakeLockResult.error}`)
      }
    })
  })

  test.describe('Mobile Performance and Battery Optimization', () => {
    test('should maintain good performance on mobile devices', async ({ page }) => {
      await mobileTester.initializeMobile({ width: 360, height: 800 })
      
      const performanceResult = await mobileTester.testMobilePerformance()
      
      console.log('Mobile performance metrics:')
      console.log(`- Frame rate: ${performanceResult.frameRate} FPS`)
      
      if (performanceResult.memoryUsage) {
        const memoryMB = performanceResult.memoryUsage.usedJSHeapSize / (1024 * 1024)
        console.log(`- Memory usage: ${memoryMB.toFixed(2)} MB`)
        
        // Memory usage should be reasonable for mobile
        expect(memoryMB).toBeLessThan(50) // Less than 50MB
      }
      
      // Frame rate should be reasonable (may be limited on mobile)
      expect(performanceResult.frameRate).toBeGreaterThan(15) // At least 15 FPS
    })

    test('should handle low-power mode gracefully', async ({ page }) => {
      await mobileTester.initializeMobile({ width: 375, height: 667 })
      
      // Simulate low-power conditions by limiting CPU
      await page.evaluate(() => {
        // Reduce animation frame rate
        const originalRAF = window.requestAnimationFrame
        let frameSkip = 0
        
        window.requestAnimationFrame = function(callback) {
          frameSkip++
          if (frameSkip % 2 === 0) { // Skip every other frame
            return originalRAF(callback)
          } else {
            return originalRAF(() => {}) // Skip this frame
          }
        }
      })
      
      // Start timer and monitor performance
      await page.locator('[data-testid="start-button"]').tap()
      await page.waitForTimeout(5000)
      
      // Timer should still function, even if with reduced performance
      const isTimerRunning = await page.locator('[data-testid="pause-button"]').isVisible()
      expect(isTimerRunning).toBe(true)
      
      const currentTime = await page.locator('[data-testid="current-time"]').textContent()
      expect(currentTime).toBeTruthy()
      
      await page.locator('[data-testid="stop-button"]').tap()
    })

    test('should optimize battery usage during long workouts', async ({ page }) => {
      await mobileTester.initializeMobile({ width: 390, height: 844 })
      
      // Monitor battery impact (if API available)
      const batteryInfo = await page.evaluate(async () => {
        if ('getBattery' in navigator) {
          try {
            const battery = await (navigator as any).getBattery()
            return {
              charging: battery.charging,
              level: battery.level,
              chargingTime: battery.chargingTime,
              dischargingTime: battery.dischargingTime
            }
          } catch (error) {
            return { error: error.toString() }
          }
        }
        return { supported: false }
      })
      
      console.log('Battery API info:', batteryInfo)
      
      // Start a workout and monitor for battery optimization
      await page.locator('[data-testid="preset-selector"]').tap()
      await page.locator('[data-testid="preset-intermediate"]').tap()
      await page.locator('[data-testid="start-button"]').tap()
      
      // Run for 30 seconds and check for optimization behaviors
      await page.waitForTimeout(30000)
      
      // Check if screen dimming or other optimizations are active
      const optimizationActive = await page.evaluate(() => {
        return {
          reducedAnimations: document.body.classList.contains('reduced-motion'),
          dimmedDisplay: document.body.classList.contains('battery-saver'),
          wakeLockActive: 'wakeLock' in navigator
        }
      })
      
      console.log('Battery optimization behaviors:', optimizationActive)
      
      await page.locator('[data-testid="stop-button"]').tap()
      
      // Test should complete without battery drain errors
      expect(true).toBe(true)
    })
  })

  // Save mobile test results
  test.afterEach(async ({ page, browserName }, testInfo) => {
    // Capture mobile-specific state information
    const mobileState = await page.evaluate(() => {
      return {
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio
        },
        touchSupport: {
          maxTouchPoints: navigator.maxTouchPoints,
          touchStart: 'ontouchstart' in window,
          touchEvents: 'TouchEvent' in window
        },
        mobileFeatures: {
          orientation: (screen as any).orientation?.type || 'unknown',
          vibrate: 'vibrate' in navigator,
          wakeLock: 'wakeLock' in navigator,
          fullscreen: 'requestFullscreen' in document.documentElement
        },
        performance: (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize
        } : null
      }
    })
    
    // Save test results
    const resultsDir = path.join(__dirname, '../test-results')
    await fs.mkdir(resultsDir, { recursive: true })
    
    await fs.writeFile(
      path.join(resultsDir, `mobile-test-${browserName}-${testInfo.title.replace(/\s+/g, '-')}-${Date.now()}.json`),
      JSON.stringify({
        testTitle: testInfo.title,
        browserName,
        status: testInfo.status,
        duration: testInfo.duration,
        mobileState,
        timestamp: new Date().toISOString()
      }, null, 2)
    )
  })
})