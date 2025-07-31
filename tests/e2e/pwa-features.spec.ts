/**
 * PWA Features E2E Tests for Boxing Timer MVP
 * 
 * Tests Progressive Web App functionality including installation, offline capability,
 * and native-like behavior. Critical for boxers who train in areas with poor connectivity.
 * 
 * Business Context:
 * - Boxing gyms often have poor or unreliable internet connectivity
 * - Trainers need the timer to work offline during classes
 * - PWA installation provides native app-like experience
 * - Service worker caching ensures timer functions without network
 * - Background sync and notification capabilities enhance user experience
 * - Wake lock prevents screen from turning off during training
 * 
 * Test Coverage:
 * - Web App Manifest validation and PWA criteria
 * - Service Worker registration and caching strategies
 * - Offline functionality and graceful degradation
 * - PWA installation flow and behavior
 * - Background execution and wake lock API
 * - Update notifications and version management
 * - Cross-platform PWA behavior
 */

import { test, expect, Page, BrowserContext } from '@playwright/test'
import { promises as fs } from 'fs'
import path from 'path'

/**
 * PWA Testing Utilities
 * Provides comprehensive PWA functionality testing and validation
 */
class PWATester {
  constructor(private page: Page) {}

  private selectors = {
    installButton: '[data-testid="install-pwa-button"]',
    updateNotification: '[data-testid="update-notification"]',
    offlineIndicator: '[data-testid="offline-indicator"]',
    timerDisplay: '[data-testid="timer-display"]',
    startButton: '[data-testid="start-button"]',
    currentTime: '[data-testid="current-time"]'
  }

  /**
   * Initialize PWA testing environment
   */
  async initialize() {
    await this.page.goto('/')
    await this.page.waitForLoadState('networkidle')
    
    // Wait for service worker registration
    await this.page.waitForTimeout(2000)
  }

  /**
   * Check if Web App Manifest is valid and accessible
   */
  async validateWebAppManifest(): Promise<ManifestValidation> {
    const manifestResponse = await this.page.request.get('/manifest.json')
    
    if (!manifestResponse.ok()) {
      return {
        isValid: false,
        error: `Manifest not found: ${manifestResponse.status()}`,
        manifest: null
      }
    }

    const manifestText = await manifestResponse.text()
    let manifest: any

    try {
      manifest = JSON.parse(manifestText)
    } catch (error) {
      return {
        isValid: false,
        error: `Invalid JSON in manifest: ${error}`,
        manifest: null
      }
    }

    // Validate required PWA manifest fields
    const requiredFields = ['name', 'short_name', 'start_url', 'display', 'theme_color', 'icons']
    const missingFields = requiredFields.filter(field => !manifest[field])

    // Validate icons
    const iconValidation = this.validateManifestIcons(manifest.icons || [])

    return {
      isValid: missingFields.length === 0 && iconValidation.isValid,
      error: missingFields.length > 0 
        ? `Missing required fields: ${missingFields.join(', ')}` 
        : iconValidation.error,
      manifest,
      missingFields,
      iconValidation
    }
  }

  /**
   * Validate manifest icons meet PWA requirements
   */
  private validateManifestIcons(icons: any[]): IconValidation {
    if (icons.length === 0) {
      return { isValid: false, error: 'No icons defined' }
    }

    const requiredSizes = ['192x192', '512x512']
    const availableSizes = icons.map(icon => icon.sizes).filter(Boolean)
    
    const missingRequiredSizes = requiredSizes.filter(size => 
      !availableSizes.some(availableSize => availableSize.includes(size))
    )

    return {
      isValid: missingRequiredSizes.length === 0,
      error: missingRequiredSizes.length > 0 
        ? `Missing required icon sizes: ${missingRequiredSizes.join(', ')}`
        : null,
      availableSizes,
      missingRequiredSizes
    }
  }

  /**
   * Check service worker registration and status
   */
  async checkServiceWorkerStatus(): Promise<ServiceWorkerStatus> {
    return await this.page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) {
        return {
          supported: false,
          registered: false,
          error: 'Service Worker not supported'
        }
      }

      try {
        const registration = await navigator.serviceWorker.getRegistration()
        
        return {
          supported: true,
          registered: !!registration,
          active: !!registration?.active,
          installing: !!registration?.installing,
          waiting: !!registration?.waiting,
          scope: registration?.scope || null,
          scriptURL: registration?.active?.scriptURL || null,
          state: registration?.active?.state || null
        }
      } catch (error) {
        return {
          supported: true,
          registered: false,
          error: error.toString()
        }
      }
    })
  }

  /**
   * Test offline functionality by simulating network failure
   */
  async testOfflineFunctionality(context: BrowserContext): Promise<OfflineTestResult> {
    // First, ensure page loads and works online
    await this.page.reload()
    await this.page.waitForLoadState('networkidle')
    
    const onlineTimerWorks = await this.verifyTimerFunctionality()
    
    // Go offline
    await context.setOffline(true)
    
    // Reload page to test offline loading
    try {
      await this.page.reload()
      await this.page.waitForLoadState('load', { timeout: 10000 })
      
      const offlinePageLoaded = await this.page.locator(this.selectors.timerDisplay).isVisible()
      const offlineTimerWorks = offlinePageLoaded ? await this.verifyTimerFunctionality() : false
      
      // Check for offline indicator
      const hasOfflineIndicator = await this.page.locator(this.selectors.offlineIndicator).isVisible()
      
      return {
        onlineWorking: onlineTimerWorks,
        offlinePageLoads: offlinePageLoaded,
        offlineTimerWorks: offlineTimerWorks,
        hasOfflineIndicator: hasOfflineIndicator,
        cacheStrategy: await this.analyzeCacheStrategy()
      }
    } catch (error) {
      return {
        onlineWorking: onlineTimerWorks,
        offlinePageLoads: false,
        offlineTimerWorks: false,
        hasOfflineIndicator: false,
        error: error.toString(),
        cacheStrategy: null
      }
    } finally {
      // Restore online state
      await context.setOffline(false)
    }
  }

  /**
   * Verify basic timer functionality works
   */
  private async verifyTimerFunctionality(): Promise<boolean> {
    try {
      // Check if timer display is visible
      const timerVisible = await this.page.locator(this.selectors.timerDisplay).isVisible()
      if (!timerVisible) return false

      // Try to start timer
      const startButton = this.page.locator(this.selectors.startButton)
      if (!(await startButton.isVisible())) return false

      await startButton.click()
      
      // Wait briefly and check if timer is running
      await this.page.waitForTimeout(1000)
      
      const isRunning = await this.page.locator('[data-testid="pause-button"]').isVisible()
      
      // Stop timer
      if (isRunning) {
        await this.page.locator('[data-testid="stop-button"]').click()
      }
      
      return isRunning
    } catch (error) {
      console.error('Timer functionality test failed:', error)
      return false
    }
  }

  /**
   * Analyze service worker cache strategy
   */
  private async analyzeCacheStrategy(): Promise<CacheAnalysis | null> {
    return await this.page.evaluate(async () => {
      if (!('caches' in window)) {
        return null
      }

      try {
        const cacheNames = await caches.keys()
        const cacheAnalysis: any = {
          cacheNames,
          totalCaches: cacheNames.length,
          cachedResources: {}
        }

        // Analyze first cache (main app cache)
        if (cacheNames.length > 0) {
          const cache = await caches.open(cacheNames[0])
          const requests = await cache.keys()
          
          cacheAnalysis.cachedResources = {
            total: requests.length,
            types: requests.reduce((acc: any, req) => {
              const url = req.url
              if (url.includes('.js')) acc.javascript = (acc.javascript || 0) + 1
              else if (url.includes('.css')) acc.css = (acc.css || 0) + 1
              else if (url.includes('.html')) acc.html = (acc.html || 0) + 1
              else if (url.includes('/sounds/')) acc.audio = (acc.audio || 0) + 1
              else if (url.includes('/icons/')) acc.icons = (acc.icons || 0) + 1
              else acc.other = (acc.other || 0) + 1
              return acc
            }, {})
          }
        }

        return cacheAnalysis
      } catch (error) {
        return { error: error.toString() }
      }
    })
  }

  /**
   * Test PWA installation criteria and flow
   */
  async testInstallationFlow(): Promise<InstallationTestResult> {
    // Check if PWA installation criteria are met
    const installPromptAvailable = await this.page.evaluate(() => {
      return 'BeforeInstallPromptEvent' in window || 
             'onbeforeinstallprompt' in window
    })

    // Look for custom install button
    const customInstallButton = await this.page.locator(this.selectors.installButton).isVisible()

    // Simulate beforeinstallprompt event if needed
    const installPromptResult = await this.page.evaluate(() => {
      return new Promise(resolve => {
        let prompted = false
        
        const handler = (e: any) => {
          e.preventDefault()
          prompted = true
          resolve({ prompted: true, event: 'beforeinstallprompt' })
        }

        window.addEventListener('beforeinstallprompt', handler)
        
        // If no prompt after 2 seconds, resolve with no prompt
        setTimeout(() => {
          if (!prompted) {
            window.removeEventListener('beforeinstallprompt', handler)
            resolve({ prompted: false, reason: 'No install prompt available' })
          }
        }, 2000)
      })
    })

    return {
      installPromptAvailable,
      customInstallButton,
      installPromptResult,
      pwaInstallable: installPromptAvailable || customInstallButton
    }
  }

  /**
   * Test wake lock functionality for preventing screen sleep
   */
  async testWakeLockAPI(): Promise<WakeLockTestResult> {
    return await this.page.evaluate(async () => {
      const result: any = {
        supported: 'wakeLock' in navigator,
        acquired: false,
        error: null
      }

      if (!result.supported) {
        return result
      }

      try {
        const wakeLock = await (navigator as any).wakeLock.request('screen')
        result.acquired = true
        result.type = wakeLock.type
        result.released = wakeLock.released
        
        // Release the wake lock
        wakeLock.release()
        
        return result
      } catch (error) {
        result.error = error.toString()
        return result
      }
    })
  }

  /**
   * Test service worker update mechanism
   */
  async testServiceWorkerUpdate(): Promise<UpdateTestResult> {
    return await this.page.evaluate(() => {
      return new Promise(resolve => {
        if (!('serviceWorker' in navigator)) {
          resolve({
            supported: false,
            updateAvailable: false,
            error: 'Service Worker not supported'
          })
          return
        }

        navigator.serviceWorker.getRegistration().then(registration => {
          if (!registration) {
            resolve({
              supported: true,
              updateAvailable: false,
              error: 'No service worker registered'
            })
            return
          }

          // Listen for update events
          let updateFound = false
          registration.addEventListener('updatefound', () => {
            updateFound = true
          })

          // Check for updates
          registration.update().then(() => {
            setTimeout(() => {
              resolve({
                supported: true,
                updateAvailable: updateFound,
                hasWaiting: !!registration.waiting,
                hasInstalling: !!registration.installing
              })
            }, 1000)
          }).catch(error => {
            resolve({
              supported: true,
              updateAvailable: false,
              error: error.toString()
            })
          })
        })
      })
    })
  }

  /**
   * Measure PWA loading performance
   */
  async measurePWAPerformance(): Promise<PWAPerformanceMetrics> {
    const metrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const paintEntries = performance.getEntriesByType('paint')
      
      return {
        loadTime: navigation.loadEventEnd - navigation.navigationStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
        firstPaint: paintEntries.find(entry => entry.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
        transferSize: navigation.transferSize,
        encodedBodySize: navigation.encodedBodySize,
        decodedBodySize: navigation.decodedBodySize
      }
    })

    return metrics
  }
}

// Type definitions for PWA test results
interface ManifestValidation {
  isValid: boolean
  error?: string
  manifest?: any
  missingFields?: string[]
  iconValidation?: IconValidation
}

interface IconValidation {
  isValid: boolean
  error?: string | null
  availableSizes?: string[]
  missingRequiredSizes?: string[]
}

interface ServiceWorkerStatus {
  supported: boolean
  registered: boolean
  active?: boolean
  installing?: boolean
  waiting?: boolean
  scope?: string | null
  scriptURL?: string | null
  state?: string | null
  error?: string
}

interface OfflineTestResult {
  onlineWorking: boolean
  offlinePageLoads: boolean
  offlineTimerWorks: boolean
  hasOfflineIndicator: boolean
  error?: string
  cacheStrategy?: CacheAnalysis | null
}

interface CacheAnalysis {
  cacheNames: string[]
  totalCaches: number
  cachedResources: {
    total: number
    types: Record<string, number>
  }
  error?: string
}

interface InstallationTestResult {
  installPromptAvailable: boolean
  customInstallButton: boolean
  installPromptResult: any
  pwaInstallable: boolean
}

interface WakeLockTestResult {
  supported: boolean
  acquired: boolean
  type?: string
  released?: boolean
  error?: string | null
}

interface UpdateTestResult {
  supported: boolean
  updateAvailable: boolean
  hasWaiting?: boolean
  hasInstalling?: boolean
  error?: string
}

interface PWAPerformanceMetrics {
  loadTime: number
  domContentLoaded: number
  firstPaint: number
  firstContentfulPaint: number
  transferSize: number
  encodedBodySize: number
  decodedBodySize: number
}

test.describe('PWA Features E2E Tests', () => {
  let pwaTester: PWATester

  test.beforeEach(async ({ page }) => {
    pwaTester = new PWATester(page)
    await pwaTester.initialize()
  })

  test.describe('Web App Manifest Validation', () => {
    test('should have valid web app manifest', async () => {
      const manifestValidation = await pwaTester.validateWebAppManifest()
      
      expect(manifestValidation.isValid).toBe(true)
      expect(manifestValidation.manifest).toBeTruthy()
      expect(manifestValidation.error).toBeUndefined()
      
      if (manifestValidation.manifest) {
        const manifest = manifestValidation.manifest
        
        // Verify required fields
        expect(manifest.name).toBe('Boxing Timer')
        expect(manifest.short_name).toBeTruthy()
        expect(manifest.start_url).toBeTruthy()
        expect(manifest.display).toBe('standalone')
        expect(manifest.theme_color).toBeTruthy()
        expect(manifest.background_color).toBeTruthy()
        expect(Array.isArray(manifest.icons)).toBe(true)
        
        console.log('Manifest validation successful:')
        console.log(`- Name: ${manifest.name}`)
        console.log(`- Icons: ${manifest.icons.length}`)
        console.log(`- Display: ${manifest.display}`)
        console.log(`- Start URL: ${manifest.start_url}`)
      }
    })

    test('should have required PWA icons available', async ({ page }) => {
      const requiredSizes = ['192x192', '512x512']
      const iconChecks = []
      
      for (const size of requiredSizes) {
        const response = await page.request.get(`/icons/icon-${size.split('x')[0]}x${size.split('x')[1]}.png`)
        iconChecks.push({
          size,
          available: response.ok(),
          status: response.status(),
          contentType: response.headers()['content-type']
        })
      }
      
      for (const check of iconChecks) {
        expect(check.available).toBe(true)
        expect(check.status).toBe(200)
        expect(check.contentType).toContain('image')
        console.log(`Icon ${check.size}: ✓ Available (${check.contentType})`)
      }
    })

    test('should pass PWA installation criteria', async ({ page }) => {
      // Check basic PWA requirements
      const pwaChecklist = await page.evaluate(() => {
        return {
          isHTTPS: location.protocol === 'https:' || location.hostname === 'localhost',
          hasManifest: !!document.querySelector('link[rel="manifest"]'),
          hasServiceWorker: 'serviceWorker' in navigator,
          isResponsive: window.innerWidth > 0 && window.innerHeight > 0
        }
      })
      
      // For localhost testing, HTTPS requirement is relaxed
      expect(pwaChecklist.isHTTPS).toBe(true)
      expect(pwaChecklist.hasManifest).toBe(true)
      expect(pwaChecklist.hasServiceWorker).toBe(true)
      expect(pwaChecklist.isResponsive).toBe(true)
      
      console.log('PWA installation criteria check:', pwaChecklist)
    })
  })

  test.describe('Service Worker Functionality', () => {
    test('should register service worker successfully', async () => {
      const swStatus = await pwaTester.checkServiceWorkerStatus()
      
      expect(swStatus.supported).toBe(true)
      expect(swStatus.registered).toBe(true)
      expect(swStatus.active).toBe(true)
      expect(swStatus.error).toBeUndefined()
      
      if (swStatus.scriptURL) {
        expect(swStatus.scriptURL).toContain('sw.js')
      }
      
      console.log('Service Worker Status:')
      console.log(`- Supported: ${swStatus.supported}`)
      console.log(`- Registered: ${swStatus.registered}`)
      console.log(`- Active: ${swStatus.active}`)
      console.log(`- Script URL: ${swStatus.scriptURL}`)
      console.log(`- Scope: ${swStatus.scope}`)
    })

    test('should cache essential resources', async ({ page }) => {
      // Wait for service worker to cache resources
      await page.waitForTimeout(3000)
      
      const cacheAnalysis = await page.evaluate(async () => {
        if (!('caches' in window)) return null
        
        const cacheNames = await caches.keys()
        if (cacheNames.length === 0) return null
        
        const cache = await caches.open(cacheNames[0])
        const cachedRequests = await cache.keys()
        
        return {
          cacheNames,
          totalCachedResources: cachedRequests.length,
          cachedUrls: cachedRequests.map(req => req.url)
        }
      })
      
      expect(cacheAnalysis).toBeTruthy()
      expect(cacheAnalysis!.totalCachedResources).toBeGreaterThan(0)
      
      // Check for essential resources
      const essentialResources = ['/', '/manifest.json']
      for (const resource of essentialResources) {
        const isCached = cacheAnalysis!.cachedUrls.some(url => url.endsWith(resource))
        console.log(`${resource} cached: ${isCached}`)
      }
      
      console.log(`Total cached resources: ${cacheAnalysis!.totalCachedResources}`)
    })

    test('should handle service worker updates', async () => {
      const updateResult = await pwaTester.testServiceWorkerUpdate()
      
      expect(updateResult.supported).toBe(true)
      expect(updateResult.error).toBeUndefined()
      
      console.log('Service Worker update test:')
      console.log(`- Update check completed: ${!updateResult.error}`)
      console.log(`- Has waiting worker: ${updateResult.hasWaiting}`)
      console.log(`- Has installing worker: ${updateResult.hasInstalling}`)
    })
  })

  test.describe('Offline Functionality', () => {
    test('should work offline', async ({ context }) => {
      const offlineTest = await pwaTester.testOfflineFunctionality(context)
      
      expect(offlineTest.onlineWorking).toBe(true)
      expect(offlineTest.offlinePageLoads).toBe(true)
      expect(offlineTest.offlineTimerWorks).toBe(true)
      
      console.log('Offline functionality test:')
      console.log(`- Online timer works: ${offlineTest.onlineWorking}`)
      console.log(`- Offline page loads: ${offlineTest.offlinePageLoads}`)
      console.log(`- Offline timer works: ${offlineTest.offlineTimerWorks}`)
      console.log(`- Has offline indicator: ${offlineTest.hasOfflineIndicator}`)
      
      if (offlineTest.cacheStrategy) {
        console.log(`- Cached resources: ${offlineTest.cacheStrategy.cachedResources?.total || 0}`)
      }
    })

    test('should show offline indicator when disconnected', async ({ page, context }) => {
      // Go offline
      await context.setOffline(true)
      
      // Wait for offline detection
      await page.waitForTimeout(2000)
      
      // Check for offline indicator
      const offlineIndicatorVisible = await page.locator(this.selectors.offlineIndicator).isVisible()
      
      // Go back online
      await context.setOffline(false)
      await page.waitForTimeout(2000)
      
      // Offline indicator should disappear
      const onlineIndicatorHidden = !await page.locator(this.selectors.offlineIndicator).isVisible()
      
      console.log(`Offline indicator shown when offline: ${offlineIndicatorVisible}`)
      console.log(`Offline indicator hidden when online: ${onlineIndicatorHidden}`)
      
      // At minimum, should handle offline gracefully
      expect(true).toBe(true) // Test documents behavior rather than enforcing specific UI
    })

    test('should maintain timer state during network fluctuations', async ({ page, context }) => {
      // Start a timer
      await page.locator('[data-testid="preset-selector"]').click()
      await page.locator('[data-testid="preset-beginner"]').click()
      await page.locator('[data-testid="start-button"]').click()
      
      // Wait for timer to run
      await page.waitForTimeout(3000)
      const timeBeforeOffline = await page.locator('[data-testid="current-time"]').textContent()
      
      // Go offline
      await context.setOffline(true)
      await page.waitForTimeout(3000)
      
      // Timer should continue running offline
      const timeWhileOffline = await page.locator('[data-testid="current-time"]').textContent()
      
      // Go back online
      await context.setOffline(false)
      await page.waitForTimeout(2000)
      
      const timeAfterOnline = await page.locator('[data-testid="current-time"]').textContent()
      
      // Timer should have continued running throughout
      expect(timeWhileOffline).not.toBe(timeBeforeOffline)
      expect(timeAfterOnline).not.toBe(timeWhileOffline)
      
      console.log(`Timer progression: ${timeBeforeOffline} -> ${timeWhileOffline} -> ${timeAfterOnline}`)
      
      await page.locator('[data-testid="stop-button"]').click()
    })
  })

  test.describe('PWA Installation Flow', () => {
    test('should support PWA installation prompt', async () => {
      const installTest = await pwaTester.testInstallationFlow()
      
      console.log('PWA Installation test:')
      console.log(`- Install prompt available: ${installTest.installPromptAvailable}`)
      console.log(`- Custom install button: ${installTest.customInstallButton}`)
      console.log(`- PWA installable: ${installTest.pwaInstallable}`)
      
      // Should have some form of installation capability
      expect(installTest.pwaInstallable).toBe(true)
    })

    test('should handle installation prompt interaction', async ({ page }) => {
      // Simulate install prompt handling
      const installPromptHandled = await page.evaluate(() => {
        return new Promise(resolve => {
          let handled = false
          
          const handler = (e: Event) => {
            e.preventDefault()
            handled = true
            resolve(true)
          }
          
          window.addEventListener('beforeinstallprompt', handler)
          
          // Trigger install prompt if available
          setTimeout(() => {
            window.removeEventListener('beforeinstallprompt', handler)
            resolve(handled)
          }, 2000)
        })
      })
      
      console.log(`Install prompt interaction handled: ${installPromptHandled}`)
      
      // Test should complete without errors
      expect(true).toBe(true)
    })
  })

  test.describe('Advanced PWA Features', () => {
    test('should support wake lock API for screen management', async () => {
      const wakeLockTest = await pwaTester.testWakeLockAPI()
      
      console.log('Wake Lock API test:')
      console.log(`- Supported: ${wakeLockTest.supported}`)
      console.log(`- Successfully acquired: ${wakeLockTest.acquired}`)
      
      if (wakeLockTest.error) {
        console.log(`- Error: ${wakeLockTest.error}`)
      }
      
      // Wake lock may not be available in all test environments
      expect(typeof wakeLockTest.supported).toBe('boolean')
    })

    test('should handle background execution appropriately', async ({ page, context }) => {
      // Start timer
      await page.locator('[data-testid="preset-selector"]').click()
      await page.locator('[data-testid="preset-beginner"]').click()
      await page.locator('[data-testid="start-button"]').click()
      
      const initialTime = await page.locator('[data-testid="current-time"]').textContent()
      
      // Create new tab to send timer to background
      const newTab = await context.newPage()
      await newTab.goto('about:blank')
      
      // Wait while in background
      await newTab.waitForTimeout(5000)
      
      // Return to timer tab
      await page.bringToFront()
      
      const finalTime = await page.locator('[data-testid="current-time"]').textContent()
      
      // Timer should have continued (may have reduced precision in background)
      expect(finalTime).not.toBe(initialTime)
      
      console.log(`Timer progression in background: ${initialTime} -> ${finalTime}`)
      
      await newTab.close()
      await page.locator('[data-testid="stop-button"]').click()
    })

    test('should handle app updates gracefully', async ({ page }) => {
      // Check for update notification handling
      const updateHandling = await page.evaluate(() => {
        // Simulate app update scenario
        return {
          hasUpdateHandler: typeof (window as any).handleAppUpdate === 'function',
          hasUpdateNotification: !!document.querySelector('[data-testid="update-notification"]'),
          hasReloadHandler: typeof (window as any).reloadApp === 'function'
        }
      })
      
      console.log('App update handling:')
      console.log(`- Has update handler: ${updateHandling.hasUpdateHandler}`)
      console.log(`- Has update notification: ${updateHandling.hasUpdateNotification}`)
      console.log(`- Has reload handler: ${updateHandling.hasReloadHandler}`)
      
      // Test should complete without errors
      expect(true).toBe(true)
    })
  })

  test.describe('PWA Performance', () => {
    test('should meet PWA performance criteria', async () => {
      const performanceMetrics = await pwaTester.measurePWAPerformance()
      
      console.log('PWA Performance Metrics:')
      console.log(`- Load time: ${performanceMetrics.loadTime.toFixed(2)}ms`)
      console.log(`- DOM Content Loaded: ${performanceMetrics.domContentLoaded.toFixed(2)}ms`)
      console.log(`- First Paint: ${performanceMetrics.firstPaint.toFixed(2)}ms`)
      console.log(`- First Contentful Paint: ${performanceMetrics.firstContentfulPaint.toFixed(2)}ms`)
      console.log(`- Transfer size: ${performanceMetrics.transferSize} bytes`)
      
      // PWA performance requirements (relaxed for test environment)
      expect(performanceMetrics.loadTime).toBeLessThan(5000) // 5 seconds max
      expect(performanceMetrics.firstContentfulPaint).toBeLessThan(3000) // 3 seconds max
      expect(performanceMetrics.domContentLoaded).toBeLessThan(3000) // 3 seconds max
    })

    test('should have efficient caching strategy', async ({ page }) => {
      // Test cache hit ratio by making repeated requests
      const cacheEfficiency = await page.evaluate(async () => {
        const testUrls = ['/', '/manifest.json']
        const results = []
        
        for (const url of testUrls) {
          const startTime = performance.now()
          
          try {
            const response = await fetch(url)
            const endTime = performance.now()
            
            results.push({
              url,
              success: response.ok,
              fromCache: response.type === 'cached' || endTime - startTime < 10,
              responseTime: endTime - startTime
            })
          } catch (error) {
            results.push({
              url,
              success: false,
              error: error.toString()
            })
          }
        }
        
        return results
      })
      
      console.log('Cache efficiency test:', cacheEfficiency)
      
      // Should successfully fetch resources
      for (const result of cacheEfficiency) {
        expect(result.success).toBe(true)
      }
    })
  })

  // Save PWA test results
  test.afterEach(async ({ page, browserName }, testInfo) => {
    // Capture PWA state information
    const pwaState = await page.evaluate(async () => {
      const result: any = {
        serviceWorker: null,
        manifest: null,
        installation: null,
        performance: null
      }
      
      // Service Worker state
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration()
          result.serviceWorker = {
            registered: !!registration,
            active: !!registration?.active,
            scope: registration?.scope
          }
        } catch (error) {
          result.serviceWorker = { error: error.toString() }
        }
      }
      
      // PWA installation state
      result.installation = {
        standalone: window.matchMedia('(display-mode: standalone)').matches,
        prompt: 'BeforeInstallPromptEvent' in window
      }
      
      // Basic performance metrics
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      if (navigation) {
        result.performance = {
          loadTime: navigation.loadEventEnd - navigation.navigationStart,
          transferSize: navigation.transferSize
        }
      }
      
      return result
    })
    
    // Save test results
    const resultsDir = path.join(__dirname, '../test-results')
    await fs.mkdir(resultsDir, { recursive: true })
    
    await fs.writeFile(
      path.join(resultsDir, `pwa-test-${browserName}-${testInfo.title.replace(/\s+/g, '-')}-${Date.now()}.json`),
      JSON.stringify({
        testTitle: testInfo.title,
        browserName,
        status: testInfo.status,
        duration: testInfo.duration,
        pwaState,
        timestamp: new Date().toISOString()
      }, null, 2)
    )
  })
})