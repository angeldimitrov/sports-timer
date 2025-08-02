/**
 * Playwright Global Setup for Boxing Timer E2E Tests
 * 
 * Configures the testing environment for comprehensive end-to-end testing of the
 * boxing timer MVP application. Sets up necessary permissions, browser contexts,
 * and validates that the application is ready for testing.
 * 
 * Setup includes:
 * - Audio permissions for Web Audio API testing
 * - PWA and service worker validation
 * - Mobile device simulation preparation
 * - Test data and state preparation
 */

import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup function called before any tests run
 * 
 * Responsibilities:
 * - Verify the development server is running and responsive
 * - Grant necessary permissions for audio and media testing
 * - Prepare browser contexts for PWA testing
 * - Validate core application functionality is available
 * - Set up any required test fixtures or data
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Boxing Timer E2E Test Setup...');

  // Get base URL from config
  const baseURL = config.projects[0].use?.baseURL;
  if (!baseURL) {
    throw new Error('Base URL not configured for testing');
  }

  console.log(`📡 Testing against: ${baseURL}`);

  // Launch browser for setup validation
  const browser = await chromium.launch();
  const context = await browser.newContext({
    // Grant permissions needed for audio testing
    permissions: ['camera', 'microphone'],
    // Enable service worker for PWA testing
    serviceWorkers: 'allow',
  });

  const page = await context.newPage();

  try {
    // Validate application is accessible and loads correctly
    console.log('🔍 Validating application accessibility...');
    
    const response = await page.goto(baseURL, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    if (!response?.ok()) {
      throw new Error(`Application not accessible: ${response?.status()} ${response?.statusText()}`);
    }

    // Validate core elements are present
    console.log('🎯 Validating core application elements...');
    
    // Check for main timer display
    await page.waitForSelector('[data-testid="timer-display"]', { timeout: 10000 });
    
    // Check for timer controls
    await page.waitForSelector('[data-testid="timer-controls"]', { timeout: 5000 });
    
    // Check for preset selector
    await page.waitForSelector('[data-testid="preset-selector"]', { timeout: 5000 });

    // Validate Web Audio API support
    console.log('🔊 Validating Web Audio API support...');
    
    const hasWebAudio = await page.evaluate(() => {
      return !!(window.AudioContext || (window as any).webkitAudioContext);
    });
    
    if (hasWebAudio) {
      console.log('✅ Web Audio API support detected');
    } else {
      console.warn('⚠️  Web Audio API not supported in test environment');
    }

    // Validate service worker registration for PWA testing
    console.log('⚙️ Validating service worker support...');
    
    const hasServiceWorker = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });
    
    if (hasServiceWorker) {
      console.log('✅ Service Worker support detected');
      
      // Wait for service worker to register if present
      try {
        await page.waitForFunction(() => {
          return navigator.serviceWorker.ready;
        }, { timeout: 5000 });
        console.log('✅ Service Worker ready');
      } catch (swError) {
        console.warn('⚠️  Service Worker not ready within timeout');
      }
    } else {
      console.warn('⚠️  Service Worker not supported in test environment');
    }

    // Validate localStorage access for settings persistence testing
    console.log('💾 Validating localStorage support...');
    
    const hasLocalStorage = await page.evaluate(() => {
      try {
        localStorage.setItem('test', 'value');
        const result = localStorage.getItem('test') === 'value';
        localStorage.removeItem('test');
        return result;
      } catch {
        return false;
      }
    });
    
    if (hasLocalStorage) {
      console.log('✅ localStorage support confirmed');
    } else {
      throw new Error('localStorage not available - required for settings persistence tests');
    }

    // Test audio file accessibility
    console.log('🎵 Validating audio files accessibility...');
    
    const audioFiles = [
      '/sounds/bell.mp3',
      '/sounds/round-starts.mp3',
      '/sounds/end-of-the-round.mp3',
      '/sounds/ten-seconds.mp3'
    ];
    
    for (const audioFile of audioFiles) {
      try {
        const audioResponse = await page.request.get(`${baseURL}${audioFile}`);
        if (audioResponse.ok()) {
          console.log(`✅ Audio file accessible: ${audioFile}`);
        } else {
          console.warn(`⚠️  Audio file not accessible: ${audioFile} (${audioResponse.status()})`);
        }
      } catch (audioError) {
        console.warn(`⚠️  Error checking audio file ${audioFile}:`, audioError);
      }
    }

    // Initialize audio system to avoid first-time delays in tests
    console.log('🔧 Pre-initializing audio system...');
    
    try {
      await page.evaluate(async () => {
        // Simulate user interaction to enable audio
        const button = document.querySelector('button');
        if (button) {
          button.click();
        }
        
        // Try to initialize audio context
        try {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContext) {
            const context = new AudioContext();
            if (context.state === 'suspended') {
              await context.resume();
            }
            await context.close();
          }
        } catch (audioInitError) {
          console.warn('Audio pre-initialization failed:', audioInitError);
        }
      });
      console.log('✅ Audio system pre-initialization completed');
    } catch (audioSetupError) {
      console.warn('⚠️  Audio pre-initialization failed:', audioSetupError);
    }

    // Clear any existing test data
    console.log('🧹 Clearing any existing test data...');
    
    await page.evaluate(() => {
      // Clear localStorage of any boxing timer settings
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('boxing-timer-') || key.startsWith('timer-')) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear any session storage
      sessionStorage.clear();
    });

    console.log('✅ Boxing Timer E2E Test Setup Complete!');

  } catch (setupError) {
    console.error('❌ E2E Test Setup Failed:', setupError);
    throw setupError;
  } finally {
    // Clean up setup browser
    await context.close();
    await browser.close();
  }
}

export default globalSetup;