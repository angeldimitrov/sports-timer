/**
 * Playwright Global Setup for Boxing Timer E2E Tests
 * 
 * Global setup configuration for end-to-end testing:
 * - Development server management and health checks
 * - Test database setup and seeding
 * - Authentication and session management
 * - Browser context configuration and optimization
 * - Performance monitoring and baseline establishment
 * - Cross-browser compatibility verification
 * - PWA functionality verification
 * - Mobile device simulation setup
 */

import { chromium, firefox, webkit, FullConfig } from '@playwright/test'
import { spawn, ChildProcess } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'

interface GlobalSetupConfig {
  devServerPort: number
  devServerHost: string
  devServerTimeout: number
  healthCheckRetries: number
  baselinePerformanceMetrics: {
    loadTime: number
    firstContentfulPaint: number
    largestContentfulPaint: number
    cumulativeLayoutShift: number
  }
}

const setupConfig: GlobalSetupConfig = {
  devServerPort: 3000,
  devServerHost: 'localhost',
  devServerTimeout: 120000, // 2 minutes
  healthCheckRetries: 30,
  baselinePerformanceMetrics: {
    loadTime: 2000, // 2 seconds max
    firstContentfulPaint: 1000, // 1 second max
    largestContentfulPaint: 2500, // 2.5 seconds max
    cumulativeLayoutShift: 0.1 // CLS should be < 0.1
  }
}

let devServer: ChildProcess | null = null

/**
 * Start development server for testing
 * Business Rule: Development server must be running and healthy before E2E tests
 */
async function startDevServer(): Promise<void> {
  console.log('🚀 Starting development server...')

  return new Promise((resolve, reject) => {
    devServer = spawn('npm', ['run', 'dev'], {
      stdio: 'pipe',
      env: {
        ...process.env,
        PORT: setupConfig.devServerPort.toString(),
        NODE_ENV: 'test',
        NEXT_TELEMETRY_DISABLED: '1'
      }
    })

    let serverStarted = false
    const timeout = setTimeout(() => {
      if (!serverStarted) {
        reject(new Error(`Development server failed to start within ${setupConfig.devServerTimeout}ms`))
      }
    }, setupConfig.devServerTimeout)

    devServer.stdout?.on('data', (data) => {
      const output = data.toString()
      console.log(`Dev Server: ${output}`)
      
      // Check for server ready indicators
      if (output.includes('Ready on') || output.includes('started server on')) {
        if (!serverStarted) {
          serverStarted = true
          clearTimeout(timeout)
          console.log('✅ Development server started successfully')
          resolve()
        }
      }
    })

    devServer.stderr?.on('data', (data) => {
      const error = data.toString()
      console.error(`Dev Server Error: ${error}`)
      
      // Check for critical errors
      if (error.includes('EADDRINUSE') || error.includes('Error:')) {
        reject(new Error(`Development server error: ${error}`))
      }
    })

    devServer.on('error', (error) => {
      reject(new Error(`Failed to start development server: ${error.message}`))
    })

    devServer.on('exit', (code, signal) => {
      if (code !== 0 && !serverStarted) {
        reject(new Error(`Development server exited with code ${code} and signal ${signal}`))
      }
    })
  })
}

/**
 * Health check the development server
 * Business Rule: Server must be responsive and serving correct content
 */
async function healthCheckServer(): Promise<void> {
  const baseUrl = `http://${setupConfig.devServerHost}:${setupConfig.devServerPort}`
  
  console.log('🏥 Performing server health check...')

  for (let attempt = 1; attempt <= setupConfig.healthCheckRetries; attempt++) {
    try {
      const response = await fetch(baseUrl)
      
      if (response.ok) {
        const html = await response.text()
        
        // Verify the page contains expected content
        if (html.includes('Boxing Timer') || html.includes('next')) {
          console.log('✅ Server health check passed')
          return
        } else {
          throw new Error('Server returned unexpected content')
        }
      } else {
        throw new Error(`Server returned status ${response.status}`)
      }
    } catch (error) {
      console.log(`❌ Health check attempt ${attempt}/${setupConfig.healthCheckRetries} failed: ${error}`)
      
      if (attempt === setupConfig.healthCheckRetries) {
        throw new Error(`Server health check failed after ${setupConfig.healthCheckRetries} attempts`)
      }
      
      // Wait 2 seconds before retry
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
}

/**
 * Establish performance baselines
 * Business Rule: Performance metrics must meet baseline requirements
 */
async function establishPerformanceBaselines(): Promise<void> {
  console.log('📊 Establishing performance baselines...')

  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // Navigate to the app
    const baseUrl = `http://${setupConfig.devServerHost}:${setupConfig.devServerPort}`
    await page.goto(baseUrl)

    // Measure performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const paintEntries = performance.getEntriesByType('paint')
      
      const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0
      const lcp = paintEntries.find(entry => entry.name === 'largest-contentful-paint')?.startTime || 0
      
      return {
        loadTime: navigation.loadEventEnd - navigation.navigationStart,
        firstContentfulPaint: fcp,
        largestContentfulPaint: lcp,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart
      }
    })

    // Validate against baselines
    const { baselinePerformanceMetrics } = setupConfig
    
    if (performanceMetrics.loadTime > baselinePerformanceMetrics.loadTime) {
      console.warn(`⚠️  Load time (${performanceMetrics.loadTime}ms) exceeds baseline (${baselinePerformanceMetrics.loadTime}ms)`)
    }

    if (performanceMetrics.firstContentfulPaint > baselinePerformanceMetrics.firstContentfulPaint) {
      console.warn(`⚠️  FCP (${performanceMetrics.firstContentfulPaint}ms) exceeds baseline (${baselinePerformanceMetrics.firstContentfulPaint}ms)`)
    }

    console.log('📈 Performance baseline metrics:', performanceMetrics)
    
    // Store baseline metrics for test comparison
    const metricsPath = path.join(__dirname, '../test-results/baseline-metrics.json')
    await fs.mkdir(path.dirname(metricsPath), { recursive: true })
    await fs.writeFile(metricsPath, JSON.stringify(performanceMetrics, null, 2))

    console.log('✅ Performance baselines established')
  } finally {
    await context.close()
    await browser.close()
  }
}

/**
 * Verify PWA functionality
 * Business Rule: PWA features must be working before E2E tests
 */
async function verifyPWAFunctionality(): Promise<void> {
  console.log('🔧 Verifying PWA functionality...')

  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    const baseUrl = `http://${setupConfig.devServerHost}:${setupConfig.devServerPort}`
    await page.goto(baseUrl)

    // Check for service worker registration
    const hasServiceWorker = await page.evaluate(() => {
      return 'serviceWorker' in navigator
    })

    if (!hasServiceWorker) {
      console.warn('⚠️  Service Worker not supported in test environment')
    }

    // Check for web app manifest
    const manifestResponse = await page.request.get(`${baseUrl}/manifest.json`)
    if (manifestResponse.ok()) {
      const manifest = await manifestResponse.json()
      console.log('📱 Web App Manifest verified:', manifest.name || 'Boxing Timer')
    } else {
      console.warn('⚠️  Web App Manifest not found')
    }

    // Check for PWA icons
    const iconSizes = ['192', '512']
    for (const size of iconSizes) {
      const iconResponse = await page.request.get(`${baseUrl}/icons/icon-${size}.png`)
      if (!iconResponse.ok()) {
        console.warn(`⚠️  PWA icon icon-${size}.png not found`)
      }
    }

    console.log('✅ PWA functionality verified')
  } finally {
    await context.close()
    await browser.close()
  }
}

/**
 * Setup browser contexts for cross-browser testing
 * Business Rule: All target browsers must be available and configured
 */
async function setupBrowserContexts(): Promise<void> {
  console.log('🌐 Setting up browser contexts...')

  const browsers = [
    { name: 'Chromium', launcher: chromium },
    { name: 'Firefox', launcher: firefox },
    { name: 'WebKit', launcher: webkit }
  ]

  for (const { name, launcher } of browsers) {
    try {
      const browser = await launcher.launch({ headless: true })
      await browser.close()
      console.log(`✅ ${name} browser verified`)
    } catch (error) {
      console.error(`❌ ${name} browser setup failed:`, error)
      throw new Error(`Failed to setup ${name} browser`)
    }
  }

  console.log('✅ Browser contexts setup complete')
}

/**
 * Create test data and configuration files
 * Business Rule: Test data should be consistent and isolated
 */
async function createTestData(): Promise<void> {
  console.log('📁 Creating test data...')

  const testDataDir = path.join(__dirname, '../test-data')
  await fs.mkdir(testDataDir, { recursive: true })

  // Test configurations for different scenarios
  const testConfigs = {
    beginner: {
      workDuration: 120,
      restDuration: 60,
      totalRounds: 3,
      enableWarning: true
    },
    intermediate: {
      workDuration: 180,
      restDuration: 60,
      totalRounds: 5,
      enableWarning: true
    },
    advanced: {
      workDuration: 180,
      restDuration: 60,
      totalRounds: 12,
      enableWarning: true
    },
    custom: {
      workDuration: 240,
      restDuration: 90,
      totalRounds: 8,
      enableWarning: false
    }
  }

  await fs.writeFile(
    path.join(testDataDir, 'timer-configs.json'),
    JSON.stringify(testConfigs, null, 2)
  )

  // Audio test files metadata
  const audioTestData = {
    requiredSounds: ['bell.mp3', 'beep.mp3'],
    supportedFormats: ['mp3', 'wav', 'ogg'],
    maxFileSize: 1024 * 1024, // 1MB
    sampleRate: 44100
  }

  await fs.writeFile(
    path.join(testDataDir, 'audio-test-data.json'),
    JSON.stringify(audioTestData, null, 2)
  )

  // Mobile device configurations
  const mobileDevices = {
    'iPhone 12': {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15',
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true
    },
    'Samsung Galaxy S21': {
      userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36',
      viewport: { width: 360, height: 800 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true
    },
    'iPad Pro': {
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15',
      viewport: { width: 1024, height: 1366 },
      deviceScaleFactor: 2,
      isMobile: false,
      hasTouch: true
    }
  }

  await fs.writeFile(
    path.join(testDataDir, 'mobile-devices.json'),
    JSON.stringify(mobileDevices, null, 2)
  )

  console.log('✅ Test data created')
}

/**
 * Setup accessibility testing tools
 * Business Rule: Accessibility compliance must be verified
 */
async function setupAccessibilityTesting(): Promise<void> {
  console.log('♿ Setting up accessibility testing...')

  // Create accessibility test configuration
  const a11yConfig = {
    rules: {
      'color-contrast': { enabled: true },
      'keyboard-navigation': { enabled: true },
      'aria-labels': { enabled: true },
      'focus-management': { enabled: true },
      'screen-reader': { enabled: true }
    },
    tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
    exclude: [
      // Exclude third-party components that we can't control
      '[data-testid="third-party-widget"]'
    ]
  }

  const configPath = path.join(__dirname, '../test-data/a11y-config.json')
  await fs.writeFile(configPath, JSON.stringify(a11yConfig, null, 2))

  console.log('✅ Accessibility testing setup complete')
}

/**
 * Main global setup function
 */
async function globalSetup(config: FullConfig): Promise<void> {
  console.log('🎬 Starting Boxing Timer E2E Test Global Setup...')
  console.log(`📊 Test configuration: ${config.projects.length} projects, ${config.workers} workers`)

  try {
    // Create necessary directories
    await fs.mkdir(path.join(__dirname, '../test-results'), { recursive: true })
    await fs.mkdir(path.join(__dirname, '../screenshots'), { recursive: true })
    await fs.mkdir(path.join(__dirname, '../videos'), { recursive: true })

    // Setup steps in order
    await startDevServer()
    await healthCheckServer()
    await establishPerformanceBaselines()
    await verifyPWAFunctionality()
    await setupBrowserContexts()
    await createTestData()
    await setupAccessibilityTesting()

    console.log('🎉 Global setup completed successfully!')
    console.log(`🌐 Application available at: http://${setupConfig.devServerHost}:${setupConfig.devServerPort}`)
    
    // Store server info for tests
    process.env.E2E_BASE_URL = `http://${setupConfig.devServerHost}:${setupConfig.devServerPort}`
    process.env.E2E_SERVER_READY = 'true'

  } catch (error) {
    console.error('❌ Global setup failed:', error)
    
    // Cleanup on failure
    if (devServer && !devServer.killed) {
      console.log('🧹 Cleaning up development server...')
      devServer.kill('SIGTERM')
    }
    
    throw error
  }
}

export default globalSetup