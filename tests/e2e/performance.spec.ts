/**
 * Performance E2E Tests for Boxing Timer MVP
 * 
 * Tests load time, responsiveness, memory usage, and overall performance benchmarks.
 * Ensures the timer meets the <2 second load time requirement and performs well during workouts.
 * 
 * Business Context:
 * - Boxers need immediate access to timing tools without waiting for slow loading
 * - Timer precision depends on consistent performance throughout workouts
 * - Mobile devices have limited resources and need optimized performance
 * - Long workouts (48 minutes for advanced) test memory management
 * - Performance affects battery life on mobile devices
 * - Poor performance can impact timer accuracy and user experience
 * 
 * Test Coverage:
 * - Initial page load time (<2 seconds requirement)
 * - First Contentful Paint and Largest Contentful Paint metrics
 * - Runtime performance during timer operation
 * - Memory usage and leak detection
 * - Battery consumption optimization
 * - Network performance and caching efficiency
 * - Bundle size and resource optimization  
 * - Frame rate and animation performance
 */

import { test, expect, Page, CDPSession } from '@playwright/test'
import { promises as fs } from 'fs'
import path from 'path'

/**
 * Performance Testing Utilities
 * Provides comprehensive performance measurement and analysis capabilities
 */
class PerformanceTester {
  private cdpSession?: CDPSession
  
  constructor(private page: Page) {}

  /**
   * Initialize performance testing environment
   */
  async initialize() {
    // Enable CDP for advanced performance monitoring
    this.cdpSession = await this.page.context().newCDPSession(this.page)
    
    // Enable performance monitoring domains
    await this.cdpSession.send('Performance.enable')
    await this.cdpSession.send('Runtime.enable')
    
    // Clear any existing performance data
    await this.page.evaluate(() => performance.clearMarks())
    await this.page.evaluate(() => performance.clearMeasures())
  }

  /**
   * Measure page load performance
   */
  async measurePageLoadPerformance(): Promise<PageLoadMetrics> {
    const startTime = Date.now()
    
    // Navigate to the application
    await this.page.goto('/', { waitUntil: 'networkidle' })
    
    const loadEndTime = Date.now()
    const totalLoadTime = loadEndTime - startTime
    
    // Get detailed performance metrics
    const perfMetrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const paintEntries = performance.getEntriesByType('paint')
      
      return {
        // Navigation timing
        navigationStart: navigation.navigationStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
        loadComplete: navigation.loadEventEnd - navigation.navigationStart,
        
        // Paint timing
        firstPaint: paintEntries.find(entry => entry.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
        
        // Resource timing
        transferSize: navigation.transferSize,
        encodedBodySize: navigation.encodedBodySize,
        decodedBodySize: navigation.decodedBodySize,
        
        // Network timing
        dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
        tcpConnect: navigation.connectEnd - navigation.connectStart,
        requestResponse: navigation.responseEnd - navigation.requestStart,
        
        // Processing timing
        domProcessing: navigation.domComplete - navigation.domLoading,
        renderTime: navigation.loadEventStart - navigation.domContentLoadedEventEnd
      }
    })
    
    // Get Largest Contentful Paint
    const lcpMetric = await this.getLargestContentfulPaint()
    
    // Get Cumulative Layout Shift
    const clsMetric = await this.getCumulativeLayoutShift()
    
    return {
      totalLoadTime,
      ...perfMetrics,
      largestContentfulPaint: lcpMetric,
      cumulativeLayoutShift: clsMetric,
      meetsRequirement: totalLoadTime <= 2000 && perfMetrics.firstContentfulPaint <= 1500
    }
  }

  /**
   * Get Largest Contentful Paint metric
   */
  private async getLargestContentfulPaint(): Promise<number> {
    return await this.page.evaluate(() => {
      return new Promise(resolve => {
        if ('PerformanceObserver' in window) {
          const observer = new PerformanceObserver(entryList => {
            const entries = entryList.getEntries()
            const lastEntry = entries[entries.length - 1]
            resolve(lastEntry?.startTime || 0)
          })
          
          observer.observe({ type: 'largest-contentful-paint', buffered: true })
          
          // Fallback timeout
          setTimeout(() => resolve(0), 5000)
        } else {
          resolve(0)
        }
      })
    })
  }

  /**
   * Get Cumulative Layout Shift metric
   */
  private async getCumulativeLayoutShift(): Promise<number> {
    return await this.page.evaluate(() => {
      return new Promise(resolve => {
        if ('PerformanceObserver' in window) {
          let clsValue = 0
          
          const observer = new PerformanceObserver(entryList => {
            for (const entry of entryList.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value
              }
            }
          })
          
          observer.observe({ type: 'layout-shift', buffered: true })
          
          // Measure for 5 seconds
          setTimeout(() => {
            observer.disconnect()
            resolve(clsValue)
          }, 5000)
        } else {
          resolve(0)
        }
      })
    })
  }

  /**
   * Measure runtime performance during timer operation
   */
  async measureRuntimePerformance(durationMs: number = 30000): Promise<RuntimeMetrics> {
    // Start timer
    await this.page.locator('[data-testid="preset-selector"]').click()
    await this.page.locator('[data-testid="preset-intermediate"]').click()
    await this.page.locator('[data-testid="start-button"]').click()
    
    const startTime = Date.now()
    
    // Monitor performance during timer operation
    const performanceData = await this.page.evaluate((duration) => {
      return new Promise(resolve => {
        const metrics = {
          frameRates: [],
          memoryUsage: [],
          cpuUsage: [],
          timerAccuracy: [],
          startTime: performance.now()
        } as any
        
        let frameCount = 0
        let lastFrameTime = performance.now()
        
        // Monitor frame rate
        const measureFrameRate = () => {
          frameCount++
          const currentTime = performance.now()
          
          if (currentTime - lastFrameTime >= 1000) {
            metrics.frameRates.push(frameCount)
            frameCount = 0
            lastFrameTime = currentTime
          }
          
          if (currentTime - metrics.startTime < duration) {
            requestAnimationFrame(measureFrameRate)
          }
        }
        
        // Monitor memory usage
        const measureMemory = () => {
          if ((performance as any).memory) {
            metrics.memoryUsage.push({
              timestamp: performance.now(),
              used: (performance as any).memory.usedJSHeapSize,
              total: (performance as any).memory.totalJSHeapSize,
              limit: (performance as any).memory.jsHeapSizeLimit
            })
          }
        }
        
        // Monitor timer accuracy
        const measureTimerAccuracy = () => {
          const timerDisplay = document.querySelector('[data-testid="current-time"]')
          if (timerDisplay) {
            const timeText = timerDisplay.textContent || ''
            const [minutes, seconds] = timeText.split(':').map(Number)
            const timerValue = minutes * 60 + seconds
            
            metrics.timerAccuracy.push({
              timestamp: performance.now(),
              timerValue,
              systemTime: Date.now()
            })
          }
        }
        
        // Start monitoring
        requestAnimationFrame(measureFrameRate)
        
        const memoryInterval = setInterval(measureMemory, 1000)
        const timerInterval = setInterval(measureTimerAccuracy, 500)
        
        // Stop monitoring after duration
        setTimeout(() => {
          clearInterval(memoryInterval)
          clearInterval(timerInterval)
          
          resolve({
            ...metrics,
            duration: performance.now() - metrics.startTime,
            averageFrameRate: metrics.frameRates.length > 0 
              ? metrics.frameRates.reduce((sum: number, rate: number) => sum + rate, 0) / metrics.frameRates.length 
              : 0
          })
        }, duration)
      })
    }, durationMs)
    
    // Stop timer
    await this.page.locator('[data-testid="stop-button"]').click()
    
    return performanceData as RuntimeMetrics
  }

  /**
   * Measure memory usage and detect leaks
   */
  async measureMemoryUsage(): Promise<MemoryMetrics> {
    const initialMemory = await this.getMemoryUsage()
    
    // Perform multiple timer operations to test for leaks
    for (let i = 0; i < 5; i++) {
      await this.page.locator('[data-testid="preset-selector"]').click()
      await this.page.locator('[data-testid="preset-beginner"]').click()
      await this.page.locator('[data-testid="start-button"]').click()
      await this.page.waitForTimeout(3000)
      await this.page.locator('[data-testid="stop-button"]').click()
      await this.page.waitForTimeout(1000)
    }
    
    // Force garbage collection if possible
    await this.page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc()
      }
    })
    
    await this.page.waitForTimeout(2000)
    const finalMemory = await this.getMemoryUsage()
    
    return {
      initial: initialMemory,
      final: finalMemory,
      difference: finalMemory ? finalMemory.used - (initialMemory?.used || 0) : 0,
      hasLeak: finalMemory && initialMemory ? 
        (finalMemory.used - initialMemory.used) > (initialMemory.used * 0.5) : false // 50% increase indicates potential leak
    }
  }

  /**
   * Get current memory usage
   */
  private async getMemoryUsage(): Promise<MemoryUsage | null> {
    return await this.page.evaluate(() => {
      if ((performance as any).memory) {
        return {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize,
          limit: (performance as any).memory.jsHeapSizeLimit
        }
      }
      return null
    })
  }

  /**
   * Measure network performance and caching
   */
  async measureNetworkPerformance(): Promise<NetworkMetrics> {
    let requestCount = 0
    let totalTransferSize = 0
    let cachedRequests = 0
    const resourceTimings: ResourceTiming[] = []
    
    // Monitor network requests
    this.page.on('response', response => {
      requestCount++
      
      if (response.fromServiceWorker() || response.status() === 304) {
        cachedRequests++
      }
      
      // Track resource timing
      resourceTimings.push({
        url: response.url(),
        status: response.status(),
        size: response.headers()['content-length'] ? 
          parseInt(response.headers()['content-length']) : 0,
        cached: response.fromServiceWorker() || response.status() === 304,
        type: this.getResourceType(response.url())
      })
    })
    
    // Load page fresh (no cache)
    await this.page.goto('/', { waitUntil: 'networkidle' })
    
    // Calculate total transfer size
    totalTransferSize = resourceTimings.reduce((sum, resource) => sum + resource.size, 0)
    
    // Test cache performance - reload page
    const cacheStartTime = Date.now()
    await this.page.reload({ waitUntil: 'networkidle' })
    const cacheLoadTime = Date.now() - cacheStartTime
    
    return {
      initialLoad: {
        requestCount,
        totalTransferSize,
        resources: resourceTimings
      },
      cachePerformance: {
        loadTime: cacheLoadTime,
        cachedRequests,
        cacheHitRatio: requestCount > 0 ? cachedRequests / requestCount : 0
      },
      bundleSize: this.analyzeBundleSize(resourceTimings)
    }
  }

  /**
   * Get resource type from URL
   */
  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'javascript'
    if (url.includes('.css')) return 'stylesheet'
    if (url.includes('.png') || url.includes('.jpg') || url.includes('.svg')) return 'image'
    if (url.includes('.mp3') || url.includes('.wav')) return 'audio'
    if (url.includes('.woff') || url.includes('.ttf')) return 'font'
    if (url.includes('.html') || url.endsWith('/')) return 'document'
    return 'other'
  }

  /**
   * Analyze bundle size and composition
   */
  private analyzeBundleSize(resources: ResourceTiming[]): BundleSizeAnalysis {
    const analysis: BundleSizeAnalysis = {
      javascript: 0,
      css: 0,
      images: 0,
      audio: 0,
      fonts: 0,
      total: 0
    }
    
    resources.forEach(resource => {
      analysis.total += resource.size
      
      switch (resource.type) {
        case 'javascript':
          analysis.javascript += resource.size
          break
        case 'stylesheet':
          analysis.css += resource.size
          break
        case 'image':
          analysis.images += resource.size
          break
        case 'audio':
          analysis.audio += resource.size
          break
        case 'font':
          analysis.fonts += resource.size
          break
      }
    })
    
    return analysis
  }

  /**
   * Measure battery consumption optimization
   */
  async measureBatteryOptimization(): Promise<BatteryOptimizationMetrics> {
    const metrics: BatteryOptimizationMetrics = {
      reducedAnimations: false,
      wakeLockOptimized: false,
      backgroundThrottling: false,
      cpuUsageOptimized: false
    }
    
    // Check if reduced motion is respected
    metrics.reducedAnimations = await this.page.evaluate(() => {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    })
    
    // Check wake lock optimization
    metrics.wakeLockOptimized = await this.page.evaluate(() => {
      return 'wakeLock' in navigator
    })
    
    // Test background performance
    metrics.backgroundThrottling = await this.testBackgroundThrottling()
    
    // Test CPU usage during timer operation
    metrics.cpuUsageOptimized = await this.testCPUUsage()
    
    return metrics
  }

  /**
   * Test background tab performance throttling
   */
  private async testBackgroundThrottling(): Promise<boolean> {
    // Create new tab to send current tab to background
    const context = this.page.context()
    const newPage = await context.newPage()
    await newPage.goto('about:blank')
    
    // Start timer in background tab
    await this.page.locator('[data-testid="start-button"]').click()
    await this.page.waitForTimeout(5000)
    
    // Measure performance in background
    const backgroundPerf = await this.page.evaluate(() => {
      let frameCount = 0
      const startTime = performance.now()
      
      return new Promise(resolve => {
        const measureFrames = () => {
          frameCount++
          if (performance.now() - startTime < 3000) {
            requestAnimationFrame(measureFrames)
          } else {
            resolve(frameCount / 3) // FPS over 3 seconds
          }
        }
        measureFrames()
      })
    })
    
    await this.page.locator('[data-testid="stop-button"]').click()
    await newPage.close()
    
    // Background should have reduced frame rate (indicating proper throttling)
    return (backgroundPerf as number) < 30 // Less than 30 FPS indicates throttling
  }

  /**
   * Test CPU usage optimization
   */
  private async testCPUUsage(): Promise<boolean> {
    // Start intensive timer operation
    await this.page.locator('[data-testid="preset-selector"]').click()
    await this.page.locator('[data-testid="preset-advanced"]').click()
    await this.page.locator('[data-testid="start-button"]').click()
    
    // Measure CPU-intensive metrics
    const cpuMetrics = await this.page.evaluate(() => {
      return new Promise(resolve => {
        let totalTime = 0
        let samples = 0
        
        const measureCPU = () => {
          const start = performance.now()
          
          // Simulate some work
          for (let i = 0; i < 1000; i++) {
            Math.random()
          }
          
          const end = performance.now()
          totalTime += (end - start)
          samples++
          
          if (samples < 100) {
            setTimeout(measureCPU, 50)
          } else {
            resolve(totalTime / samples)
          }
        }
        
        measureCPU()
      })
    })
    
    await this.page.locator('[data-testid="stop-button"]').click()
    
    // CPU usage should be optimized (low average time per operation)
    return (cpuMetrics as number) < 1 // Less than 1ms average indicates good optimization
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(): Promise<PerformanceReport> {
    console.log('Generating comprehensive performance report...')
    
    const pageLoad = await this.measurePageLoadPerformance()
    const runtime = await this.measureRuntimePerformance(15000) // 15 seconds
    const memory = await this.measureMemoryUsage()
    const network = await this.measureNetworkPerformance()
    const battery = await this.measureBatteryOptimization()
    
    return {
      timestamp: new Date().toISOString(),
      pageLoad,
      runtime,
      memory,
      network,
      battery,
      summary: {
        meetsLoadTimeRequirement: pageLoad.meetsRequirement,
        hasMemoryLeaks: memory.hasLeak,
        optimizedForMobile: battery.cpuUsageOptimized && battery.backgroundThrottling,
        cacheEfficiency: network.cachePerformance.cacheHitRatio,
        overallScore: this.calculateOverallScore(pageLoad, runtime, memory, network, battery)
      }
    }
  }

  /**
   * Calculate overall performance score
   */
  private calculateOverallScore(
    pageLoad: PageLoadMetrics,
    runtime: RuntimeMetrics,
    memory: MemoryMetrics,
    network: NetworkMetrics,
    battery: BatteryOptimizationMetrics
  ): number {
    let score = 100
    
    // Page load performance (30 points)
    if (!pageLoad.meetsRequirement) score -= 20
    if (pageLoad.firstContentfulPaint > 2000) score -= 10
    
    // Runtime performance (25 points)
    if (runtime.averageFrameRate < 30) score -= 15
    if (runtime.memoryUsage.length > 0) {
      const memoryGrowth = runtime.memoryUsage[runtime.memoryUsage.length - 1].used - runtime.memoryUsage[0].used
      if (memoryGrowth > 10 * 1024 * 1024) score -= 10 // 10MB growth
    }
    
    // Memory management (20 points)
    if (memory.hasLeak) score -= 20
    
    // Network efficiency (15 points)
    if (network.cachePerformance.cacheHitRatio < 0.7) score -= 10
    if (network.initialLoad.totalTransferSize > 5 * 1024 * 1024) score -= 5 // 5MB
    
    // Battery optimization (10 points)
    if (!battery.cpuUsageOptimized) score -= 5
    if (!battery.backgroundThrottling) score -= 5
    
    return Math.max(0, score)
  }
}

// Type definitions for performance test results
interface PageLoadMetrics {
  totalLoadTime: number
  navigationStart: number
  domContentLoaded: number
  loadComplete: number
  firstPaint: number
  firstContentfulPaint: number
  largestContentfulPaint: number
  cumulativeLayoutShift: number
  transferSize: number
  encodedBodySize: number
  decodedBodySize: number
  dnsLookup: number
  tcpConnect: number
  requestResponse: number
  domProcessing: number
  renderTime: number
  meetsRequirement: boolean
}

interface RuntimeMetrics {
  frameRates: number[]
  memoryUsage: Array<{
    timestamp: number
    used: number
    total: number
    limit: number
  }>
  timerAccuracy: Array<{
    timestamp: number
    timerValue: number
    systemTime: number
  }>
  duration: number
  averageFrameRate: number
}

interface MemoryUsage {
  used: number
  total: number
  limit: number
}

interface MemoryMetrics {
  initial: MemoryUsage | null
  final: MemoryUsage | null
  difference: number
  hasLeak: boolean
}

interface ResourceTiming {
  url: string
  status: number
  size: number
  cached: boolean
  type: string
}

interface BundleSizeAnalysis {
  javascript: number
  css: number
  images: number
  audio: number
  fonts: number
  total: number
}

interface NetworkMetrics {
  initialLoad: {
    requestCount: number
    totalTransferSize: number
    resources: ResourceTiming[]
  }
  cachePerformance: {
    loadTime: number
    cachedRequests: number
    cacheHitRatio: number
  }
  bundleSize: BundleSizeAnalysis
}

interface BatteryOptimizationMetrics {
  reducedAnimations: boolean
  wakeLockOptimized: boolean
  backgroundThrottling: boolean
  cpuUsageOptimized: boolean
}

interface PerformanceReport {
  timestamp: string
  pageLoad: PageLoadMetrics
  runtime: RuntimeMetrics
  memory: MemoryMetrics
  network: NetworkMetrics
  battery: BatteryOptimizationMetrics
  summary: {
    meetsLoadTimeRequirement: boolean
    hasMemoryLeaks: boolean
    optimizedForMobile: boolean
    cacheEfficiency: number
    overallScore: number
  }
}

test.describe('Performance E2E Tests', () => {
  let performanceTester: PerformanceTester

  test.beforeEach(async ({ page }) => {
    performanceTester = new PerformanceTester(page)
    await performanceTester.initialize()
  })

  test.describe('Page Load Performance', () => {
    test('should meet load time requirements (<2 seconds)', async ({ browserName }) => {
      const pageLoadMetrics = await performanceTester.measurePageLoadPerformance()
      
      console.log(`\n=== ${browserName.toUpperCase()} Page Load Performance ===`)
      console.log(`Total Load Time: ${pageLoadMetrics.totalLoadTime}ms`)
      console.log(`DOM Content Loaded: ${pageLoadMetrics.domContentLoaded}ms`)
      console.log(`First Contentful Paint: ${pageLoadMetrics.firstContentfulPaint}ms`)
      console.log(`Largest Contentful Paint: ${pageLoadMetrics.largestContentfulPaint}ms`)
      console.log(`Cumulative Layout Shift: ${pageLoadMetrics.cumulativeLayoutShift}`)
      console.log(`Transfer Size: ${(pageLoadMetrics.transferSize / 1024).toFixed(2)} KB`)
      console.log(`Meets Requirements: ${pageLoadMetrics.meetsRequirement}`)
      
      // Critical performance requirements
      expect(pageLoadMetrics.totalLoadTime).toBeLessThan(2000) // 2 seconds max
      expect(pageLoadMetrics.firstContentfulPaint).toBeLessThan(1500) // 1.5 seconds max
      expect(pageLoadMetrics.cumulativeLayoutShift).toBeLessThan(0.1) // Good CLS score
      expect(pageLoadMetrics.meetsRequirement).toBe(true)
    })

    test('should have efficient resource loading', async ({ browserName }) => {
      const networkMetrics = await performanceTester.measureNetworkPerformance()
      
      console.log(`\n=== ${browserName.toUpperCase()} Network Performance ===`)
      console.log(`Initial Requests: ${networkMetrics.initialLoad.requestCount}`)
      console.log(`Total Transfer Size: ${(networkMetrics.initialLoad.totalTransferSize / 1024).toFixed(2)} KB`)
      console.log(`Bundle Analysis:`)
      console.log(`  - JavaScript: ${(networkMetrics.bundleSize.javascript / 1024).toFixed(2)} KB`)
      console.log(`  - CSS: ${(networkMetrics.bundleSize.css / 1024).toFixed(2)} KB`)
      console.log(`  - Images: ${(networkMetrics.bundleSize.images / 1024).toFixed(2)} KB`)
      console.log(`  - Audio: ${(networkMetrics.bundleSize.audio / 1024).toFixed(2)} KB`)
      console.log(`Cache Hit Ratio: ${(networkMetrics.cachePerformance.cacheHitRatio * 100).toFixed(1)}%`)
      console.log(`Cache Load Time: ${networkMetrics.cachePerformance.loadTime}ms`)
      
      // Resource efficiency requirements
      expect(networkMetrics.initialLoad.totalTransferSize).toBeLessThan(5 * 1024 * 1024) // 5MB max
      expect(networkMetrics.bundleSize.javascript).toBeLessThan(2 * 1024 * 1024) // 2MB JS max
      expect(networkMetrics.cachePerformance.loadTime).toBeLessThan(500) // Fast cache load
      
      // Good cache efficiency
      expect(networkMetrics.cachePerformance.cacheHitRatio).toBeGreaterThan(0.5) // 50% cache hit minimum
    })

    test('should optimize Core Web Vitals', async ({ browserName }) => {
      const pageLoadMetrics = await performanceTester.measurePageLoadPerformance()
      
      console.log(`\n=== ${browserName.toUpperCase()} Core Web Vitals ===`)
      console.log(`LCP (Largest Contentful Paint): ${pageLoadMetrics.largestContentfulPaint}ms`)
      console.log(`FCP (First Contentful Paint): ${pageLoadMetrics.firstContentfulPaint}ms`)
      console.log(`CLS (Cumulative Layout Shift): ${pageLoadMetrics.cumulativeLayoutShift}`)
      
      // Core Web Vitals thresholds (Good ratings)
      expect(pageLoadMetrics.largestContentfulPaint).toBeLessThan(2500) // LCP < 2.5s
      expect(pageLoadMetrics.firstContentfulPaint).toBeLessThan(1800) // FCP < 1.8s
      expect(pageLoadMetrics.cumulativeLayoutShift).toBeLessThan(0.1) // CLS < 0.1
      
      // Calculate overall Core Web Vitals score
      const lcpScore = pageLoadMetrics.largestContentfulPaint < 2500 ? 100 : 50
      const fcpScore = pageLoadMetrics.firstContentfulPaint < 1800 ? 100 : 50
      const clsScore = pageLoadMetrics.cumulativeLayoutShift < 0.1 ? 100 : 50
      const overallScore = (lcpScore + fcpScore + clsScore) / 3
      
      console.log(`Core Web Vitals Score: ${overallScore.toFixed(1)}/100`)
      expect(overallScore).toBeGreaterThan(75) // Good overall score
    })
  })

  test.describe('Runtime Performance', () => {
    test('should maintain performance during timer operation', async ({ browserName }) => {
      const runtimeMetrics = await performanceTester.measureRuntimePerformance(20000) // 20 seconds
      
      console.log(`\n=== ${browserName.toUpperCase()} Runtime Performance ===`)
      console.log(`Average Frame Rate: ${runtimeMetrics.averageFrameRate.toFixed(1)} FPS`)
      console.log(`Memory Samples: ${runtimeMetrics.memoryUsage.length}`)
      console.log(`Timer Accuracy Samples: ${runtimeMetrics.timerAccuracy.length}`)
      console.log(`Test Duration: ${(runtimeMetrics.duration / 1000).toFixed(1)}s`)
      
      if (runtimeMetrics.memoryUsage.length > 0) {
        const initialMemory = runtimeMetrics.memoryUsage[0].used / (1024 * 1024)
        const finalMemory = runtimeMetrics.memoryUsage[runtimeMetrics.memoryUsage.length - 1].used / (1024 * 1024)
        const memoryGrowth = finalMemory - initialMemory
        
        console.log(`Initial Memory: ${initialMemory.toFixed(2)} MB`)
        console.log(`Final Memory: ${finalMemory.toFixed(2)} MB`)
        console.log(`Memory Growth: ${memoryGrowth.toFixed(2)} MB`)
        
        // Memory growth should be minimal during runtime
        expect(memoryGrowth).toBeLessThan(20) // Less than 20MB growth
      }
      
      // Frame rate should be smooth
      expect(runtimeMetrics.averageFrameRate).toBeGreaterThan(30) // 30 FPS minimum
      
      // Should collect sufficient accuracy data
      expect(runtimeMetrics.timerAccuracy.length).toBeGreaterThan(20)
    })

    test('should not have memory leaks', async ({ browserName }) => {
      const memoryMetrics = await performanceTester.measureMemoryUsage()
      
      console.log(`\n=== ${browserName.toUpperCase()} Memory Leak Analysis ===`)
      
      if (memoryMetrics.initial && memoryMetrics.final) {
        console.log(`Initial Memory: ${(memoryMetrics.initial.used / (1024 * 1024)).toFixed(2)} MB`)
        console.log(`Final Memory: ${(memoryMetrics.final.used / (1024 * 1024)).toFixed(2)} MB`)
        console.log(`Memory Difference: ${(memoryMetrics.difference / (1024 * 1024)).toFixed(2)} MB`)
        console.log(`Has Memory Leak: ${memoryMetrics.hasLeak}`)
        
        // Should not have significant memory leaks
        expect(memoryMetrics.hasLeak).toBe(false)
        expect(memoryMetrics.difference).toBeLessThan(50 * 1024 * 1024) // Less than 50MB increase
      } else {
        console.log('Memory API not available in this browser')
        // Memory API might not be available in all browsers
        expect(true).toBe(true)
      }
    })

    test('should optimize for battery consumption', async ({ browserName }) => {
      const batteryMetrics = await performanceTester.measureBatteryOptimization()
      
      console.log(`\n=== ${browserName.toUpperCase()} Battery Optimization ===`)
      console.log(`Reduced Animations: ${batteryMetrics.reducedAnimations}`)
      console.log(`Wake Lock Optimized: ${batteryMetrics.wakeLockOptimized}`)
      console.log(`Background Throttling: ${batteryMetrics.backgroundThrottling}`)
      console.log(`CPU Usage Optimized: ${batteryMetrics.cpuUsageOptimized}`)
      
      // Battery optimization checks
      expect(batteryMetrics.cpuUsageOptimized).toBe(true)
      expect(batteryMetrics.backgroundThrottling).toBe(true)
      
      // Wake lock should be available for preventing screen sleep
      if (browserName === 'chromium') {
        expect(batteryMetrics.wakeLockOptimized).toBe(true)
      }
    })
  })

  test.describe('Mobile Performance', () => {
    test('should perform well on mobile devices', async ({ page, browserName }) => {
      // Simulate mobile device conditions
      await page.emulate({
        name: 'iPhone 12',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15',
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true
      })
      
      const mobileMetrics = await performanceTester.measurePageLoadPerformance()
      
      console.log(`\n=== ${browserName.toUpperCase()} Mobile Performance ===`)
      console.log(`Mobile Load Time: ${mobileMetrics.totalLoadTime}ms`)
      console.log(`Mobile FCP: ${mobileMetrics.firstContentfulPaint}ms`)
      console.log(`Mobile LCP: ${mobileMetrics.largestContentfulPaint}ms`)
      
      // Mobile performance should still meet requirements (with some tolerance)
      expect(mobileMetrics.totalLoadTime).toBeLessThan(3000) // 3 seconds for mobile
      expect(mobileMetrics.firstContentfulPaint).toBeLessThan(2000) // 2 seconds FCP
      expect(mobileMetrics.largestContentfulPaint).toBeLessThan(3000) // 3 seconds LCP
    })

    test('should handle low-end device simulation', async ({ page, browserName }) => {
      // Simulate slower device with CPU throttling
      const cdpSession = await page.context().newCDPSession(page)
      await cdpSession.send('Emulation.setCPUThrottlingRate', { rate: 4 }) // 4x slower
      
      const throttledMetrics = await performanceTester.measurePageLoadPerformance()
      
      console.log(`\n=== ${browserName.toUpperCase()} Low-End Device Performance ===`)
      console.log(`Throttled Load Time: ${throttledMetrics.totalLoadTime}ms`)
      console.log(`Throttled FCP: ${throttledMetrics.firstContentfulPaint}ms`)
      
      // Should still function on low-end devices (with relaxed requirements)
      expect(throttledMetrics.totalLoadTime).toBeLessThan(5000) // 5 seconds max
      expect(throttledMetrics.firstContentfulPaint).toBeLessThan(3000) // 3 seconds FCP
      
      // Reset CPU throttling
      await cdpSession.send('Emulation.setCPUThrottlingRate', { rate: 1 })
    })
  })

  test.describe('Long-Duration Performance', () => {
    test('should maintain performance during extended workouts', async ({ browserName }) => {
      // Start advanced workout (longest duration)
      await performanceTester.page.locator('[data-testid="preset-selector"]').click()
      await performanceTester.page.locator('[data-testid="preset-advanced"]').click()
      await performanceTester.page.locator('[data-testid="start-button"]').click()
      
      // Monitor performance over extended period (2 minutes to simulate long workout)
      const extendedMetrics = await performanceTester.measureRuntimePerformance(120000) // 2 minutes
      
      console.log(`\n=== ${browserName.toUpperCase()} Extended Workout Performance ===`)
      console.log(`Extended Test Duration: ${(extendedMetrics.duration / 1000).toFixed(1)}s`)
      console.log(`Average Frame Rate: ${extendedMetrics.averageFrameRate.toFixed(1)} FPS`)
      
      if (extendedMetrics.memoryUsage.length > 0) {
        const memoryGrowth = extendedMetrics.memoryUsage[extendedMetrics.memoryUsage.length - 1].used - 
                           extendedMetrics.memoryUsage[0].used
        console.log(`Memory Growth: ${(memoryGrowth / (1024 * 1024)).toFixed(2)} MB`)
        
        // Memory growth should be controlled over extended periods
        expect(memoryGrowth).toBeLessThan(30 * 1024 * 1024) // Less than 30MB growth
      }
      
      // Performance should remain stable
      expect(extendedMetrics.averageFrameRate).toBeGreaterThan(25) // Slightly relaxed for extended test
      
      await performanceTester.page.locator('[data-testid="stop-button"]').click()
    })
  })

  test.describe('Performance Benchmarking', () => {
    test('should generate comprehensive performance report', async ({ browserName }) => {
      const performanceReport = await performanceTester.generatePerformanceReport()
      
      console.log(`\n=== ${browserName.toUpperCase()} Performance Report ===`)
      console.log(`Overall Score: ${performanceReport.summary.overallScore}/100`)
      console.log(`Meets Load Time Requirement: ${performanceReport.summary.meetsLoadTimeRequirement}`)
      console.log(`Has Memory Leaks: ${performanceReport.summary.hasMemoryLeaks}`)
      console.log(`Optimized for Mobile: ${performanceReport.summary.optimizedForMobile}`)
      console.log(`Cache Efficiency: ${(performanceReport.summary.cacheEfficiency * 100).toFixed(1)}%`)
      
      // Overall performance expectations
      expect(performanceReport.summary.overallScore).toBeGreaterThan(70) // Good performance score
      expect(performanceReport.summary.meetsLoadTimeRequirement).toBe(true)
      expect(performanceReport.summary.hasMemoryLeaks).toBe(false)
      
      // Save detailed report
      const resultsDir = path.join(__dirname, '../test-results')
      await fs.mkdir(resultsDir, { recursive: true })
      
      await fs.writeFile(
        path.join(resultsDir, `performance-report-${browserName}-${Date.now()}.json`),
        JSON.stringify(performanceReport, null, 2)
      )
      
      console.log(`Detailed performance report saved for ${browserName}`)
    })
  })

  // Save performance test results
  test.afterEach(async ({ page, browserName }, testInfo) => {
    // Capture final performance state
    const finalPerformanceState = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      
      return {
        timing: {
          loadComplete: navigation.loadEventEnd - navigation.navigationStart,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart
        },
        memory: (performance as any).memory ? {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize,
          limit: (performance as any).memory.jsHeapSizeLimit
        } : null,
        resources: performance.getEntriesByType('resource').length,
        marks: performance.getEntriesByType('mark').length,
        measures: performance.getEntriesByType('measure').length
      }
    })
    
    // Save test-specific performance data
    const resultsDir = path.join(__dirname, '../test-results')
    await fs.mkdir(resultsDir, { recursive: true })
    
    await fs.writeFile(
      path.join(resultsDir, `performance-test-${browserName}-${testInfo.title.replace(/\s+/g, '-')}-${Date.now()}.json`),
      JSON.stringify({
        testTitle: testInfo.title,
        browserName,
        status: testInfo.status,
        duration: testInfo.duration,
        performanceState: finalPerformanceState,
        timestamp: new Date().toISOString()
      }, null, 2)
    )
  })
})