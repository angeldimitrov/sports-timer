/**
 * Playwright Configuration for Boxing Timer MVP
 * 
 * End-to-end testing configuration covering cross-browser compatibility,
 * mobile testing, PWA functionality, and performance validation.
 */

import { defineConfig, devices } from '@playwright/test'

// Use process.env.PORT by default and fallback to port 3001 for testing
const PORT = process.env.PORT || 3001

// The base URL for testing - adjust based on your development server
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  // Test directory
  testDir: './tests/e2e',
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],
  
  // Global test configuration
  use: {
    // Base URL for all tests
    baseURL,
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // Record video on failure
    video: 'retain-on-failure',
    
    // Global timeout
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  
  // Expect configuration
  expect: {
    // Global timeout for assertions
    timeout: 10000,
    
    // Screenshot comparison settings
    toHaveScreenshot: {
      threshold: 0.3,
    },
  },
  
  // Test projects for multiple browsers and devices
  projects: [
    // Desktop browsers - Primary testing targets
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Enable permissions for Web Audio API
        contextOptions: {
          permissions: ['camera', 'microphone']
        }
      },
    },
    
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        contextOptions: {
          permissions: ['camera', 'microphone']
        }
      },
    },
    
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        contextOptions: {
          permissions: ['camera', 'microphone']
        }
      },
    },
    
    // Mobile devices - Critical for boxing timer usage
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        contextOptions: {
          permissions: ['camera', 'microphone']
        }
      },
    },
    
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
        contextOptions: {
          permissions: ['camera', 'microphone']
        }
      },
    },
    
    // Tablet testing
    {
      name: 'iPad',
      use: { 
        ...devices['iPad Pro'],
        contextOptions: {
          permissions: ['camera', 'microphone']
        }
      },
    },
    
    // High DPI displays
    {
      name: 'Desktop Chrome HiDPI',
      use: { 
        ...devices['Desktop Chrome HiDPI'],
        contextOptions: {
          permissions: ['camera', 'microphone']
        }
      },
    },
    
    // Older browser versions for compatibility testing
    {
      name: 'Chrome 90',
      use: {
        channel: 'chrome',
        contextOptions: {
          permissions: ['camera', 'microphone']
        }
      },
    },
  ],
  
  // Local dev server for testing
  webServer: {
    command: 'npm run dev -- --port 3001',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minutes to start dev server
    stderr: 'pipe',
    stdout: 'pipe',
  },
  
  // Test output directory
  outputDir: 'test-results/',
  
  // Global setup and teardown
  globalSetup: require.resolve('./tests/e2e/global-setup.ts'),
  globalTeardown: require.resolve('./tests/e2e/global-teardown.ts'),
  
  // Test timeout
  timeout: 60000, // 1 minute per test
  
  // Test file patterns
  testMatch: [
    '**/tests/e2e/**/*.spec.ts',
    '**/tests/e2e/**/*.test.ts'
  ],
  
  // Ignore test files
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/.next/**'
  ],
  
  // Metadata
  metadata: {
    'test-type': 'e2e',
    'app': 'boxing-timer-mvp',
    'version': '1.0.0'
  }
})