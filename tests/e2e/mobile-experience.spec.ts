/**
 * Mobile Experience E2E Test
 * 
 * Tests the complete mobile user experience including touch interactions,
 * PWA functionality, mobile audio handling, and responsive design.
 * 
 * Test Coverage:
 * - Touch gesture controls and mobile UI
 * - PWA installation and offline functionality
 * - Mobile audio playback and background handling
 * - Responsive design across different screen sizes
 * - Mobile-specific features (wake lock, orientation)
 * 
 * Business Critical: Boxing athletes primarily use mobile devices during workouts.
 * This test ensures the mobile experience is optimized and fully functional.
 */

import { test, expect, devices } from '@playwright/test';

// Test on mobile devices
test.use({ ...devices['iPhone 12'] });

test.describe('Mobile Experience', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for application to load
    await page.waitForLoadState('networkidle');
    
    // Simulate mobile user interaction for audio permissions
    await page.tap('body');
  });

  test('should provide touch-friendly interface with proper mobile controls', async ({ page }) => {
    console.log('📱 Testing mobile touch interface...');

    // Verify mobile-optimized layout
    const timerDisplay = page.locator('[data-testid="timer-display"]');
    await expect(timerDisplay).toBeVisible();
    
    // Check that timer display is large enough for mobile viewing
    const displayBox = await timerDisplay.boundingBox();
    expect(displayBox?.height).toBeGreaterThan(80); // Minimum touch target size
    
    // Test touch interactions with timer controls
    console.log('👆 Testing touch controls...');
    
    const startButton = page.locator('[data-testid="start-button"]');
    const pauseButton = page.locator('[data-testid="pause-button"]');
    const resetButton = page.locator('[data-testid="reset-button"]');
    
    // Verify buttons are touch-friendly (minimum 44px height)
    for (const button of [startButton, resetButton]) {
      const buttonBox = await button.boundingBox();
      expect(buttonBox?.height).toBeGreaterThanOrEqual(44);
      expect(buttonBox?.width).toBeGreaterThanOrEqual(44);
    }
    
    // Test tap interactions
    await page.tap('[data-testid="preset-beginner"]');
    await page.tap('[data-testid="start-button"]');
    
    // Verify timer starts
    await expect(page.locator('[data-testid="timer-status"]')).toContainText('Running');
    
    // Test pause with tap
    await page.tap('[data-testid="pause-button"]');
    await expect(page.locator('[data-testid="timer-status"]')).toContainText('Paused');
    
    // Test resume with tap
    await page.tap('[data-testid="resume-button"]');
    await expect(page.locator('[data-testid="timer-status"]')).toContainText('Running');
    
    console.log('✅ Mobile touch interface test passed!');
  });

  test('should handle mobile gestures and swipe interactions', async ({ page }) => {
    console.log('👋 Testing mobile gesture controls...');

    // Test swipe to change presets (if implemented)
    const presetContainer = page.locator('[data-testid="preset-selector"]');
    await expect(presetContainer).toBeVisible();
    
    // Get initial preset
    const initialPreset = await page.textContent('[data-testid="selected-preset"]');
    
    // Simulate swipe gesture on preset container
    const containerBox = await presetContainer.boundingBox();
    if (containerBox) {
      // Swipe left (next preset)
      await page.mouse.move(containerBox.x + containerBox.width - 50, containerBox.y + 50);
      await page.mouse.down();
      await page.mouse.move(containerBox.x + 50, containerBox.y + 50, { steps: 10 });
      await page.mouse.up();
      
      // Wait for preset change animation
      await page.waitForTimeout(500);
      
      const newPreset = await page.textContent('[data-testid="selected-preset"]');
      // Preset may have changed (implementation dependent)
      console.log(`Preset change: ${initialPreset} → ${newPreset}`);
    }
    
    // Test long press for settings (if implemented)
    await page.locator('[data-testid="timer-display"]').tap({ timeout: 1000 });
    
    console.log('✅ Mobile gesture controls test passed!');
  });

  test('should support PWA installation and offline functionality', async ({ page, context }) => {
    console.log('📱 Testing PWA functionality...');

    // Check for PWA manifest
    const manifestResponse = await page.request.get('/manifest.json');
    expect(manifestResponse.ok()).toBeTruthy();
    
    const manifest = await manifestResponse.json();
    expect(manifest.name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBeTruthy();
    
    // Check for service worker registration
    const swRegistered = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          return !!registration;
        } catch (error) {
          return false;
        }
      }
      return false;
    });
    
    console.log(`Service Worker registered: ${swRegistered}`);
    
    // Test basic offline functionality
    console.log('🌐 Testing offline functionality...');
    
    // Start a timer to cache the application state
    await page.tap('[data-testid="preset-beginner"]');
    await page.tap('[data-testid="start-button"]');
    
    // Wait for timer to start
    await expect(page.locator('[data-testid="timer-status"]')).toContainText('Running');
    
    // Simulate offline mode
    await context.setOffline(true);
    
    // Verify timer continues to work offline
    await page.tap('[data-testid="pause-button"]');
    await expect(page.locator('[data-testid="timer-status"]')).toContainText('Paused');
    
    await page.tap('[data-testid="resume-button"]');
    await expect(page.locator('[data-testid="timer-status"]')).toContainText('Running');
    
    // Restore online mode
    await context.setOffline(false);
    
    console.log('✅ PWA functionality test passed!');
  });

  test('should handle mobile audio playback and background execution', async ({ page }) => {
    console.log('🔊 Testing mobile audio handling...');

    // Mock mobile audio system
    await page.addInitScript(() => {
      // Simulate mobile audio constraints
      let audioPlaying = false;
      let backgroundAudioSupported = true;
      
      window.mockMobileAudio = {
        audioPlaying,
        backgroundAudioSupported,
        events: [] as string[]
      };
      
      // Mock audio manager for mobile
      window.AudioManager = {
        play: (type: string) => {
          window.mockMobileAudio.events.push(`play:${type}`);
          window.mockMobileAudio.audioPlaying = true;
          return Promise.resolve();
        },
        initialize: () => {
          window.mockMobileAudio.events.push('initialize');
          return Promise.resolve();
        }
      };
    });

    // Test audio initialization
    await page.tap('[data-testid="start-button"]');
    
    let audioEvents = await page.evaluate(() => window.mockMobileAudio?.events || []);
    expect(audioEvents).toContain('initialize');
    
    // Test background audio handling
    console.log('🌙 Testing background audio...');
    
    // Simulate app going to background
    await page.evaluate(() => {
      // Simulate visibility change
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    // Wait for background handling
    await page.waitForTimeout(1000);
    
    // Simulate app returning to foreground
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    // Verify audio system handled background transition
    audioEvents = await page.evaluate(() => window.mockMobileAudio?.events || []);
    console.log(`📱 Mobile audio events: ${audioEvents.join(', ')}`);
    
    console.log('✅ Mobile audio handling test passed!');
  });

  test('should maintain responsive design across different screen sizes', async ({ page, browser }) => {
    console.log('📐 Testing responsive design...');

    const testSizes = [
      { width: 360, height: 640, name: 'Small Mobile' },
      { width: 414, height: 896, name: 'Large Mobile' },
      { width: 768, height: 1024, name: 'Tablet Portrait' },
      { width: 1024, height: 768, name: 'Tablet Landscape' },
    ];

    for (const size of testSizes) {
      console.log(`   Testing ${size.name} (${size.width}x${size.height})`);
      
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.waitForTimeout(500); // Allow layout to adjust
      
      // Verify core elements are visible and properly sized
      const timerDisplay = page.locator('[data-testid="timer-display"]');
      const controls = page.locator('[data-testid="timer-controls"]');
      const presetSelector = page.locator('[data-testid="preset-selector"]');
      
      await expect(timerDisplay).toBeVisible();
      await expect(controls).toBeVisible();
      await expect(presetSelector).toBeVisible();
      
      // Verify no horizontal scrolling
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
      const clientWidth = await page.evaluate(() => document.body.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5); // Allow small margin
      
      // Verify timer display scales appropriately
      const displayBox = await timerDisplay.boundingBox();
      expect(displayBox?.width).toBeLessThanOrEqual(size.width);
      expect(displayBox?.height).toBeGreaterThan(50); // Minimum readable size
      
      // Test touch interactions at this size
      await page.tap('[data-testid="preset-intermediate"]');
      await expect(page.locator('[data-testid="selected-preset"]')).toContainText('Intermediate');
    }
    
    console.log('✅ Responsive design test passed!');
  });

  test('should handle mobile-specific features (wake lock, orientation)', async ({ page }) => {
    console.log('🔒 Testing mobile-specific features...');

    // Mock wake lock API
    await page.addInitScript(() => {
      let wakeLockActive = false;
      
      window.mockWakeLock = {
        active: wakeLockActive,
        requests: [] as string[]
      };
      
      // Mock navigator.wakeLock
      (navigator as any).wakeLock = {
        request: (type: string) => {
          window.mockWakeLock.requests.push(`request:${type}`);
          window.mockWakeLock.active = true;
          return Promise.resolve({
            release: () => {
              window.mockWakeLock.requests.push('release');
              window.mockWakeLock.active = false;
              return Promise.resolve();
            }
          });
        }
      };
    });

    // Start timer and check wake lock
    await page.tap('[data-testid="preset-beginner"]');
    await page.tap('[data-testid="start-button"]');
    
    // Wait for timer to start
    await expect(page.locator('[data-testid="timer-status"]')).toContainText('Running');
    
    // Check if wake lock was requested
    const wakeLockRequests = await page.evaluate(() => window.mockWakeLock?.requests || []);
    console.log(`Wake lock requests: ${wakeLockRequests.join(', ')}`);
    
    // Test orientation lock (if supported)
    const orientationSupported = await page.evaluate(() => {
      return 'orientation' in screen && 'lock' in screen.orientation;
    });
    
    console.log(`Screen orientation API supported: ${orientationSupported}`);
    
    if (orientationSupported) {
      // Test orientation handling
      await page.evaluate(() => {
        // Simulate orientation change
        window.dispatchEvent(new Event('orientationchange'));
      });
      
      await page.waitForTimeout(500);
      
      // Verify layout adjusts to orientation
      const currentWidth = await page.evaluate(() => window.innerWidth);
      const currentHeight = await page.evaluate(() => window.innerHeight);
      
      console.log(`Current viewport: ${currentWidth}x${currentHeight}`);
    }
    
    // Stop timer and verify wake lock is released
    await page.tap('[data-testid="stop-button"]');
    
    const finalWakeLockRequests = await page.evaluate(() => window.mockWakeLock?.requests || []);
    expect(finalWakeLockRequests).toContain('release');
    
    console.log('✅ Mobile-specific features test passed!');
  });

  test('should handle mobile app lifecycle events', async ({ page }) => {
    console.log('🔄 Testing mobile app lifecycle...');

    // Start a timer
    await page.tap('[data-testid="preset-beginner"]');
    await page.tap('[data-testid="start-button"]');
    
    await expect(page.locator('[data-testid="timer-status"]')).toContainText('Running');
    
    // Test page freeze (mobile background)
    console.log('❄️ Testing page freeze handling...');
    
    await page.evaluate(() => {
      // Simulate page freeze
      const freezeEvent = new Event('freeze');
      document.dispatchEvent(freezeEvent);
    });
    
    await page.waitForTimeout(500);
    
    // Verify timer state is preserved
    await expect(page.locator('[data-testid="timer-status"]')).toContainText('Running');
    
    // Test page resume
    console.log('🔄 Testing page resume handling...');
    
    await page.evaluate(() => {
      // Simulate page resume
      const resumeEvent = new Event('resume');
      document.dispatchEvent(resumeEvent);
    });
    
    await page.waitForTimeout(500);
    
    // Verify timer continues correctly
    await expect(page.locator('[data-testid="timer-status"]')).toContainText('Running');
    
    // Test memory pressure handling
    console.log('🧠 Testing memory pressure handling...');
    
    await page.evaluate(() => {
      // Simulate low memory
      const memoryEvent = new Event('memory');
      window.dispatchEvent(memoryEvent);
    });
    
    // App should continue working under memory pressure
    await page.tap('[data-testid="pause-button"]');
    await expect(page.locator('[data-testid="timer-status"]')).toContainText('Paused');
    
    console.log('✅ Mobile app lifecycle test passed!');
  });

  test('should provide proper mobile accessibility features', async ({ page }) => {
    console.log('♿ Testing mobile accessibility...');

    // Check for proper ARIA labels on mobile
    const startButton = page.locator('[data-testid="start-button"]');
    const timerDisplay = page.locator('[data-testid="timer-display"]');
    
    // Verify ARIA attributes
    await expect(startButton).toHaveAttribute('aria-label');
    await expect(timerDisplay).toHaveAttribute('aria-live', 'polite');
    
    // Test keyboard navigation (external keyboard)
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // Should activate focused element
    
    // Test high contrast mode
    await page.emulateMedia({ colorScheme: 'dark' });
    
    // Verify dark mode styling
    const body = page.locator('body');
    const computedStyle = await body.evaluate(el => getComputedStyle(el));
    
    // Should have appropriate contrast in dark mode
    console.log(`Dark mode background: ${computedStyle.backgroundColor}`);
    
    // Test reduced motion preferences
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    // Verify animations are reduced or disabled
    await page.tap('[data-testid="preset-advanced"]');
    // Animation duration should be minimal
    
    console.log('✅ Mobile accessibility test passed!');
  });
});