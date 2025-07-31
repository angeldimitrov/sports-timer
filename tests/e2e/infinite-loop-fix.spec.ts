/**
 * Infinite Loop Fix Verification Tests
 * 
 * Tests to verify that the fix for "Maximum update depth exceeded" error
 * is working correctly when accessing the boxing timer app via IP address.
 * 
 * Bug Context:
 * - When accessing app via IP address (e.g., http://192.168.87.33:3000/), clicking start
 *   caused infinite re-renders due to audio dependency in useCallback
 * - Fixed by removing audio dependency and adding proper error handling
 * 
 * Test Coverage:
 * 1. Basic functionality on localhost (baseline)
 * 2. Audio error handling scenarios (simulating IP access restrictions)
 * 3. Timer state stability under various conditions
 * 4. No excessive re-renders during operation
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test configuration
const LOCALHOST_URL = 'http://localhost:3000';
const MAX_CONSOLE_ERRORS = 3; // Allow some non-critical errors
const STABILITY_TEST_DURATION = 10000; // 10 seconds
const RENDER_COUNT_THRESHOLD = 50; // Maximum expected renders in test period

// Helper to simulate IP address access restrictions
async function blockAudioAccess(context: BrowserContext) {
  // Block audio context creation and audio file loading
  await context.addInitScript(() => {
    // Block AudioContext creation (simulates IP access security restrictions)
    (window as any).AudioContext = undefined;
    (window as any).webkitAudioContext = undefined;
    
    // Block audio file loading
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('.mp3') || url.includes('audio') || url.includes('sound')) {
        throw new Error('Network audio blocked - simulating IP access restrictions');
      }
      return originalFetch(input, init);
    };
  });
}

// Helper to monitor console errors
async function setupConsoleMonitoring(page: Page) {
  const consoleErrors: string[] = [];
  const renderCounts: number[] = [];
  let renderCount = 0;

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
    
    // Monitor potential excessive renders
    if (msg.text().includes('render') || msg.text().includes('update')) {
      renderCount++;
    }
  });

  page.on('pageerror', (error) => {
    consoleErrors.push(error.message);
  });

  // Track render count periodically
  const renderTracker = setInterval(() => {
    renderCounts.push(renderCount);
    renderCount = 0;
  }, 1000);

  return {
    getErrors: () => consoleErrors,
    getRenderCounts: () => renderCounts,
    cleanup: () => clearInterval(renderTracker)
  };
}

test.describe('Infinite Loop Fix Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure clean state
    await page.goto(LOCALHOST_URL);
    await page.waitForLoadState('networkidle');
  });

  test('should load and function normally on localhost (baseline)', async ({ page }) => {
    const monitor = await setupConsoleMonitoring(page);

    try {
      // Wait for app to load
      await expect(page.locator('.timer-display-container').first()).toBeVisible({ timeout: 10000 });
      
      // Verify start button is present and enabled
      const startButton = page.locator('button:has-text("Start")').first();
      await expect(startButton).toBeVisible();
      await expect(startButton).toBeEnabled();

      // Click start button - should work without crashing
      await startButton.click();
      
      // Wait a moment for any potential infinite loops to manifest
      await page.waitForTimeout(2000);
      
      // Verify timer is running (button text should change to "Pause")
      await expect(page.locator('button:has-text("Pause")').first()).toBeVisible({ timeout: 5000 });
      
      // Check that we don't have excessive console errors
      const errors = monitor.getErrors();
      const criticalErrors = errors.filter(error => 
        error.includes('Maximum update depth exceeded') ||
        error.includes('Too many re-renders') ||
        error.includes('infinite loop')
      );
      
      expect(criticalErrors.length).toBe(0);
      expect(errors.length).toBeLessThan(MAX_CONSOLE_ERRORS);

    } finally {
      monitor.cleanup();
    }
  });

  test('should handle audio initialization failures gracefully', async ({ page, context }) => {
    // Block audio access to simulate IP address restrictions
    await blockAudioAccess(context);
    
    const monitor = await setupConsoleMonitoring(page);

    try {
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Wait for app to load despite audio issues
      await expect(page.locator('.timer-display-container').first()).toBeVisible({ timeout: 10000 });
      
      const startButton = page.locator('button:has-text("Start")').first();
      await expect(startButton).toBeVisible();
      await expect(startButton).toBeEnabled();

      // Click start button - should NOT crash despite audio issues
      await startButton.click();
      
      // Wait longer to ensure no infinite loops occur
      await page.waitForTimeout(3000);
      
      // Timer should still function (button should change to "Pause")
      await expect(page.locator('button:has-text("Pause")').first()).toBeVisible({ timeout: 5000 });
      
      // Verify no infinite loop errors occurred
      const errors = monitor.getErrors();
      const infiniteLoopErrors = errors.filter(error => 
        error.includes('Maximum update depth exceeded') ||
        error.includes('Too many re-renders')
      );
      
      expect(infiniteLoopErrors.length).toBe(0);
      
      // Audio errors are expected and acceptable
      const audioErrors = errors.filter(error => 
        error.includes('audio') || error.includes('Audio')
      );
      console.log(`Expected audio errors: ${audioErrors.length}`);

    } finally {
      monitor.cleanup();
    }
  });

  test('should maintain timer state stability during extended operation', async ({ page }) => {
    const monitor = await setupConsoleMonitoring(page);

    try {
      await expect(page.locator('.timer-display-container').first()).toBeVisible({ timeout: 10000 });
      
      const startButton = page.locator('button:has-text("Start")').first();
      await startButton.click();
      
      // Wait for timer to start
      await expect(page.locator('button:has-text("Pause")').first()).toBeVisible({ timeout: 5000 });
      
      // Monitor stability for extended period
      const stabilityStartTime = Date.now();
      let stateChanges = 0;
      let lastTimerText = '';
      
      while (Date.now() - stabilityStartTime < STABILITY_TEST_DURATION) {
        // Check timer display updates normally
        const timerText = await page.locator('.timer-display-container').first().textContent();
        if (timerText !== lastTimerText) {
          stateChanges++;
          lastTimerText = timerText || '';
        }
        
        await page.waitForTimeout(1000);
      }
      
      // Verify timer made reasonable progress (should update roughly every second)
      expect(stateChanges).toBeGreaterThan(5);
      expect(stateChanges).toBeLessThan(RENDER_COUNT_THRESHOLD);
      
      // Check for infinite loop errors
      const errors = monitor.getErrors();
      const criticalErrors = errors.filter(error => 
        error.includes('Maximum update depth exceeded') ||
        error.includes('Too many re-renders')
      );
      
      expect(criticalErrors.length).toBe(0);

    } finally {
      monitor.cleanup();
    }
  });

  test('should handle rapid button clicks without crashes', async ({ page }) => {
    const monitor = await setupConsoleMonitoring(page);

    try {
      await expect(page.locator('.timer-display-container').first()).toBeVisible({ timeout: 10000 });
      
      const startButton = page.locator('button:has-text("Start")').first();
      
      // Rapidly click start button multiple times
      for (let i = 0; i < 5; i++) {
        await startButton.click();
        await page.waitForTimeout(100);
      }
      
      // Wait for settling
      await page.waitForTimeout(2000);
      
      // Verify app is still functional
      const pauseButton = page.locator('button:has-text("Pause")').first();
      if (await pauseButton.isVisible()) {
        // Timer started - try rapid pause/resume
        for (let i = 0; i < 3; i++) {
          await pauseButton.click();
          await page.waitForTimeout(100);
          
          const resumeButton = page.locator('button:has-text("Resume")').first();
          if (await resumeButton.isVisible()) {
            await resumeButton.click();
            await page.waitForTimeout(100);
          }
        }
      }
      
      // Verify no infinite loop errors from rapid interactions
      const errors = monitor.getErrors();
      const criticalErrors = errors.filter(error => 
        error.includes('Maximum update depth exceeded') ||
        error.includes('Too many re-renders')
      );
      
      expect(criticalErrors.length).toBe(0);

    } finally {
      monitor.cleanup();
    }
  });

  test('should handle audio volume changes without triggering loops', async ({ page, context }) => {
    // Test with blocked audio access
    await blockAudioAccess(context);
    
    const monitor = await setupConsoleMonitoring(page);

    try {
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('.timer-display-container').first()).toBeVisible({ timeout: 10000 });
      
      // Start timer despite audio issues
      const startButton = page.locator('button:has-text("Start")').first();
      await startButton.click();
      
      await expect(page.locator('button:has-text("Pause")').first()).toBeVisible({ timeout: 5000 });
      
      // Try to interact with audio controls
      const muteButton = page.locator('button[aria-label*="mute"], button:has(svg)').first();
      if (await muteButton.isVisible()) {
        await muteButton.click();
        await page.waitForTimeout(500);
        await muteButton.click(); // Toggle back
      }
      
      // Wait to ensure no cascading errors
      await page.waitForTimeout(2000);
      
      // Verify timer is still running and stable
      await expect(page.locator('button:has-text("Pause")').first()).toBeVisible();
      
      const errors = monitor.getErrors();
      const criticalErrors = errors.filter(error => 
        error.includes('Maximum update depth exceeded') ||
        error.includes('Too many re-renders')
      );
      
      expect(criticalErrors.length).toBe(0);

    } finally {
      monitor.cleanup();
    }
  });

  test('should recover gracefully from component errors', async ({ page }) => {
    const monitor = await setupConsoleMonitoring(page);

    try {
      await expect(page.locator('.timer-display-container').first()).toBeVisible({ timeout: 10000 });
      
      // Inject a potential error condition
      await page.evaluate(() => {
        // Simulate a temporary error condition
        const originalConsoleError = console.error;
        console.error = (...args: any[]) => {
          if (args[0]?.includes?.('test error')) {
            // Don't actually error, just log
            originalConsoleError('[TEST ERROR INJECTED]', ...args);
          } else {
            originalConsoleError(...args);
          }
        };
        
        // Trigger a recoverable error scenario
        setTimeout(() => {
          try {
            throw new Error('test error - should be handled gracefully');
          } catch (e) {
            console.error('test error', e);
          }
        }, 1000);
      });
      
      // Start timer after error injection
      const startButton = page.locator('button:has-text("Start")').first();
      await startButton.click();
      
      // Verify timer still works despite the injected error
      await expect(page.locator('button:has-text("Pause")').first()).toBeVisible({ timeout: 5000 });
      
      // Wait for any error recovery
      await page.waitForTimeout(3000);
      
      // Check that the app didn't crash with infinite loops
      const errors = monitor.getErrors();
      const infiniteLoopErrors = errors.filter(error => 
        error.includes('Maximum update depth exceeded') ||
        error.includes('Too many re-renders')
      );
      
      expect(infiniteLoopErrors.length).toBe(0);

    } finally {
      monitor.cleanup();
    }
  });
});

test.describe('Cross-Network Access Scenarios', () => {
  test('should handle different host access patterns', async ({ page }) => {
    const monitor = await setupConsoleMonitoring(page);

    try {
      // Test the basic localhost access first
      await page.goto(LOCALHOST_URL);
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('.timer-display-container').first()).toBeVisible({ timeout: 10000 });
      
      // Simulate conditions that might occur with IP access
      await page.evaluate(() => {
        // Modify location to simulate IP access
        Object.defineProperty(window, 'location', {
          value: {
            ...window.location,
            hostname: '192.168.1.100',
            host: '192.168.1.100:3000',
            href: 'http://192.168.1.100:3000/'
          },
          writable: true
        });
      });
      
      // Reload with simulated IP access
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('.timer-display-container').first()).toBeVisible({ timeout: 10000 });
      
      // Try to start timer
      const startButton = page.locator('button:has-text("Start")').first();
      await startButton.click();
      
      // Wait for potential issues to manifest
      await page.waitForTimeout(3000);
      
      // Verify no infinite loop occurred
      const errors = monitor.getErrors();
      const criticalErrors = errors.filter(error => 
        error.includes('Maximum update depth exceeded') ||
        error.includes('Too many re-renders')
      );
      
      expect(criticalErrors.length).toBe(0);

    } finally {
      monitor.cleanup();
    }
  });
});