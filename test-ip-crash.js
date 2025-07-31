const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true // Ignore self-signed certificate errors
  });
  const page = await context.newPage();

  try {
    console.log('Testing IP address for infinite loop crash...');
    
    // Navigate to IP address
    console.log('1. Navigating to IP address...');
    await page.goto('https://192.168.87.33:3000/', { 
      waitUntil: 'domcontentloaded', 
      timeout: 10000 
    });
    
    // Wait for React to load
    console.log('2. Waiting for React app...');
    await page.waitForTimeout(2000);
    
    // Monitor for React errors specifically
    const reactErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('Maximum update depth')) {
        reactErrors.push('INFINITE LOOP DETECTED: ' + msg.text());
      }
      if (msg.type() === 'error') {
        console.log('Console Error:', msg.text());
      }
    });
    
    // Monitor for page crashes
    page.on('pageerror', err => {
      if (err.message.includes('Maximum update depth')) {
        reactErrors.push('PAGE CRASH: ' + err.message);
      }
      console.log('Page Error:', err.message);
    });
    
    // Look for the start button
    console.log('3. Finding start button...');
    const startButton = await page.locator('button:has-text("Start")').first();
    await startButton.waitFor({ timeout: 5000 });
    
    console.log('4. About to click start - monitoring for crashes...');
    
    // Click start and immediately monitor for infinite loop
    await startButton.click();
    
    // Wait and monitor for the infinite loop crash
    console.log('5. Waiting for potential crash...');
    await page.waitForTimeout(5000);
    
    console.log('6. Results:');
    if (reactErrors.length > 0) {
      console.log('❌ INFINITE LOOP STILL EXISTS!');
      reactErrors.forEach(error => console.log('  ', error));
    } else {
      console.log('✅ No infinite loop detected - fix appears to work!');
    }
    
  } catch (error) {
    if (error.message.includes('Maximum update depth')) {
      console.log('❌ CRASH CONFIRMED: Infinite loop still happening!');
      console.log('Error:', error.message);
    } else {
      console.log('Test error (not infinite loop):', error.message);
    }
  } finally {
    await browser.close();
  }
})();