const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Testing IP address access fix...');
    
    // Navigate to IP address directly
    console.log('1. Navigating to IP address...');
    await page.goto('http://192.168.87.33:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    // Wait for the timer display to load
    console.log('2. Waiting for timer display...');
    await page.waitForSelector('[class*="timer-display"]', { timeout: 10000 });
    
    // Look for the start button
    console.log('3. Finding start button...');
    const startButton = await page.locator('button').filter({ hasText: 'Start' }).first();
    await startButton.waitFor({ timeout: 5000 });
    
    // Monitor for console errors before clicking
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Monitor for uncaught exceptions
    const exceptions = [];
    page.on('pageerror', err => {
      exceptions.push(err.message);
    });
    
    console.log('4. Clicking start button...');
    await startButton.click();
    
    // Wait a moment to see if any errors occur
    await page.waitForTimeout(3000);
    
    // Check if timer started (look for running state)
    const timerDisplay = await page.locator('[class*="timer-display"]').first();
    const hasWorkingTimer = await timerDisplay.isVisible();
    
    console.log('5. Test Results:');
    console.log(`   - Page loaded: ✓`);
    console.log(`   - Start button found: ✓`);
    console.log(`   - Start button clicked: ✓`);
    console.log(`   - Timer display visible: ${hasWorkingTimer ? '✓' : '✗'}`);
    console.log(`   - Console errors: ${errors.length}`);
    console.log(`   - Uncaught exceptions: ${exceptions.length}`);
    
    if (errors.length > 0) {
      console.log('   - Error details:', errors);
    }
    
    if (exceptions.length > 0) {
      console.log('   - Exception details:', exceptions);
    }
    
    // Check if we can see the timer counting
    console.log('6. Checking timer state...');
    const phaseText = await page.locator('text=WORK, REST, GET READY').first().textContent().catch(() => 'Not found');
    console.log(`   - Phase indicator: ${phaseText}`);
    
    if (errors.length === 0 && exceptions.length === 0) {
      console.log('\n✅ SUCCESS: No infinite loop detected! The fix appears to be working.');
    } else {
      console.log('\n❌ FAILURE: Errors detected - the issue may still exist.');
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  } finally {
    await browser.close();
  }
})();