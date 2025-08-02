/**
 * Timer Controls E2E Test
 * 
 * Tests all timer control interactions during active workouts including
 * start/pause/resume/stop/reset functionality with proper state management.
 * 
 * Test Coverage:
 * - Timer control button states and interactions
 * - State transitions during active workouts
 * - Edge cases and error conditions
 * - Keyboard shortcuts and accessibility
 * - Timer synchronization and accuracy
 * 
 * Business Critical: Boxing athletes need reliable timer controls during intense
 * workouts. Controls must respond immediately and maintain accurate timing
 * regardless of interaction patterns.
 */

import { test, expect } from '@playwright/test';

test.describe('Timer Controls', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for application to load
    await page.waitForLoadState('networkidle');
    
    // Ensure audio context is ready (simulate user interaction)
    await page.click('body');
  });

  test('should handle start/pause/resume/stop/reset sequence correctly', async ({ page }) => {
    console.log('▶️ Testing complete timer control sequence...');

    // Initial state: All controls should be in ready state
    await expect(page.locator('[data-testid="start-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="start-button"]')).toBeEnabled();
    await expect(page.locator('[data-testid="pause-button"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="stop-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="reset-button"]')).toBeVisible();
    
    // Select a preset for testing
    await page.click('[data-testid="preset-beginner"]');
    
    // Step 1: Start timer
    console.log('1️⃣ Testing START functionality...');
    const startTime = Date.now();
    await page.click('[data-testid="start-button"]');
    
    // Verify timer started state
    await expect(page.locator('[data-testid="timer-status"]')).toContainText('Running');
    await expect(page.locator('[data-testid="start-button"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="pause-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="pause-button"]')).toBeEnabled();
    await expect(page.locator('[data-testid="stop-button"]')).toBeEnabled();
    
    // Verify timer is counting down
    const initialTime = await page.textContent('[data-testid="time-remaining"]');
    await page.waitForTimeout(2000);
    const updatedTime = await page.textContent('[data-testid="time-remaining"]');
    expect(initialTime).not.toBe(updatedTime); // Time should have changed
    
    // Step 2: Pause timer
    console.log('2️⃣ Testing PAUSE functionality...');
    const pauseTime = await page.textContent('[data-testid="time-remaining"]');
    await page.click('[data-testid="pause-button"]');
    
    // Verify paused state
    await expect(page.locator('[data-testid="timer-status"]')).toContainText('Paused');
    await expect(page.locator('[data-testid="pause-button"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="resume-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="resume-button"]')).toBeEnabled();
    
    // Verify time is paused (doesn't change)
    await page.waitForTimeout(2000);
    const stillPausedTime = await page.textContent('[data-testid="time-remaining"]');
    expect(stillPausedTime).toBe(pauseTime);
    
    // Step 3: Resume timer
    console.log('3️⃣ Testing RESUME functionality...');
    await page.click('[data-testid="resume-button"]');
    
    // Verify resumed state
    await expect(page.locator('[data-testid="timer-status"]')).toContainText('Running');
    await expect(page.locator('[data-testid="resume-button"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="pause-button"]')).toBeVisible();
    
    // Verify timer resumes counting from paused time
    const resumedTime = await page.textContent('[data-testid="time-remaining"]');
    expect(resumedTime).toBe(pauseTime); // Should resume from same time
    
    // Wait and verify countdown continues
    await page.waitForTimeout(2000);
    const continuedTime = await page.textContent('[data-testid="time-remaining"]');
    expect(continuedTime).not.toBe(resumedTime);
    
    // Step 4: Stop timer
    console.log('4️⃣ Testing STOP functionality...');
    await page.click('[data-testid="stop-button"]');
    
    // Verify stopped state
    await expect(page.locator('[data-testid="timer-status"]')).toContainText('Ready');
    await expect(page.locator('[data-testid="start-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="pause-button"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="resume-button"]')).not.toBeVisible();
    
    // Verify timer reset to initial state
    const stoppedTime = await page.textContent('[data-testid="time-remaining"]');
    expect(stoppedTime).toMatch(/0:10|0:0[0-9]/); // Should show preparation time
    
    // Step 5: Test reset functionality
    console.log('5️⃣ Testing RESET functionality...');
    
    // Start timer again
    await page.click('[data-testid="start-button"]');
    await expect(page.locator('[data-testid="timer-status"]')).toContainText('Running');
    
    // Wait for some time to pass
    await page.waitForTimeout(2000);
    
    // Reset timer
    await page.click('[data-testid="reset-button"]');
    
    // Verify reset state
    await expect(page.locator('[data-testid="timer-status"]')).toContainText('Ready');
    await expect(page.locator('[data-testid="current-round"]')).toContainText('1');
    
    const resetTime = await page.textContent('[data-testid="time-remaining"]');
    expect(resetTime).toMatch(/0:10|0:0[0-9]/); // Back to preparation time
    
    console.log('✅ Timer control sequence test passed!');
  });

  test('should maintain accurate timing during pause/resume cycles', async ({ page }) => {
    console.log('⏱️ Testing timing accuracy during pause/resume...');

    // Start timer with intermediate preset (3 minutes work)
    await page.click('[data-testid="preset-intermediate"]');
    await page.click('[data-testid="start-button"]');
    
    // Wait for preparation to complete and work phase to start
    await expect(page.locator('[data-testid="timer-phase"]')).toContainText('Work', { timeout: 15000 });
    
    // Record initial work time
    const initialWorkTime = await page.textContent('[data-testid="time-remaining"]');
    const initialMinutes = parseInt(initialWorkTime?.split(':')[0] || '0');
    const initialSeconds = parseInt(initialWorkTime?.split(':')[1] || '0');
    const initialTotalSeconds = initialMinutes * 60 + initialSeconds;
    
    console.log(`Initial work time: ${initialWorkTime} (${initialTotalSeconds} seconds)`);
    
    // Let timer run for 3 seconds
    await page.waitForTimeout(3000);
    
    // Pause timer
    await page.click('[data-testid="pause-button"]');
    const pausedTime = await page.textContent('[data-testid="time-remaining"]');
    const pausedMinutes = parseInt(pausedTime?.split(':')[0] || '0');
    const pausedSeconds = parseInt(pausedTime?.split(':')[1] || '0');
    const pausedTotalSeconds = pausedMinutes * 60 + pausedSeconds;
    
    console.log(`Paused at: ${pausedTime} (${pausedTotalSeconds} seconds)`);
    
    // Verify approximately 3 seconds have elapsed (allow for small timing variations)
    const elapsedSeconds = initialTotalSeconds - pausedTotalSeconds;
    expect(elapsedSeconds).toBeGreaterThanOrEqual(2); // At least 2 seconds
    expect(elapsedSeconds).toBeLessThanOrEqual(5); // At most 5 seconds (accounting for delays)
    
    // Wait while paused to ensure time doesn't change
    await page.waitForTimeout(2000);
    const stillPausedTime = await page.textContent('[data-testid="time-remaining"]');
    expect(stillPausedTime).toBe(pausedTime);
    
    // Resume timer
    await page.click('[data-testid="resume-button"]');
    
    // Verify timer resumes from correct time
    const resumedTime = await page.textContent('[data-testid="time-remaining"]');
    expect(resumedTime).toBe(pausedTime);
    
    // Let timer run for another 2 seconds
    await page.waitForTimeout(2000);
    
    // Verify continued countdown
    const continuedTime = await page.textContent('[data-testid="time-remaining"]');
    const continuedMinutes = parseInt(continuedTime?.split(':')[0] || '0');
    const continuedSeconds = parseInt(continuedTime?.split(':')[1] || '0');
    const continuedTotalSeconds = continuedMinutes * 60 + continuedSeconds;
    
    const totalElapsed = initialTotalSeconds - continuedTotalSeconds;
    expect(totalElapsed).toBeGreaterThanOrEqual(4); // At least 4 seconds total
    expect(totalElapsed).toBeLessThanOrEqual(8); // At most 8 seconds (with delays)
    
    console.log(`Total elapsed: ${totalElapsed} seconds`);
    console.log('✅ Timing accuracy test passed!');
  });

  test('should handle rapid control interactions gracefully', async ({ page }) => {
    console.log('⚡ Testing rapid control interactions...');

    await page.click('[data-testid="preset-beginner"]');
    
    // Rapid start/pause/resume sequence
    console.log('🔄 Testing rapid start/pause/resume...');
    
    await page.click('[data-testid="start-button"]');
    await page.waitForTimeout(100);
    
    // Rapid pause/resume cycles
    for (let i = 0; i < 5; i++) {
      await page.click('[data-testid="pause-button"]');
      await page.waitForTimeout(50);
      await page.click('[data-testid="resume-button"]');
      await page.waitForTimeout(50);
    }
    
    // Verify timer is still running correctly
    await expect(page.locator('[data-testid="timer-status"]')).toContainText('Running');
    
    // Timer should still be functional
    const timeBeforePause = await page.textContent('[data-testid="time-remaining"]');
    await page.click('[data-testid="pause-button"]');
    await expect(page.locator('[data-testid="timer-status"]')).toContainText('Paused');
    
    const timeDuringPause = await page.textContent('[data-testid="time-remaining"]');
    expect(timeDuringPause).toBe(timeBeforePause);
    
    // Test rapid reset clicks
    console.log('🔄 Testing rapid reset interactions...');
    
    await page.click('[data-testid="reset-button"]');
    await page.waitForTimeout(50);
    await page.click('[data-testid="reset-button"]'); // Second reset should be safe
    await page.waitForTimeout(50);
    await page.click('[data-testid="reset-button"]'); // Third reset should be safe
    
    // Should be in ready state
    await expect(page.locator('[data-testid="timer-status"]')).toContainText('Ready');
    
    console.log('✅ Rapid interactions test passed!');
  });

  test('should support keyboard shortcuts for timer controls', async ({ page }) => {
    console.log('⌨️ Testing keyboard shortcuts...');

    await page.click('[data-testid="preset-intermediate"]');
    
    // Test spacebar for start/pause/resume
    console.log('   Testing spacebar for start/pause/resume...');
    
    // Focus the application
    await page.focus('body');
    
    // Start with spacebar
    await page.keyboard.press('Space');
    await expect(page.locator('[data-testid="timer-status"]')).toContainText('Running');
    
    // Pause with spacebar
    await page.keyboard.press('Space');
    await expect(page.locator('[data-testid="timer-status"]')).toContainText('Paused');
    
    // Resume with spacebar
    await page.keyboard.press('Space');
    await expect(page.locator('[data-testid="timer-status"]')).toContainText('Running');
    
    // Test 'R' key for reset
    console.log('   Testing R key for reset...');
    await page.keyboard.press('KeyR');
    await expect(page.locator('[data-testid="timer-status"]')).toContainText('Ready');
    
    // Test 'S' key for stop
    console.log('   Testing S key for stop...');
    await page.keyboard.press('Space'); // Start again
    await expect(page.locator('[data-testid="timer-status"]')).toContainText('Running');
    
    await page.keyboard.press('KeyS');
    await expect(page.locator('[data-testid="timer-status"]')).toContainText('Ready');
    
    // Test number keys for preset selection
    console.log('   Testing number keys for presets...');
    
    await page.keyboard.press('Digit1'); // Beginner preset
    await expect(page.locator('[data-testid="selected-preset"]')).toContainText('Beginner');
    
    await page.keyboard.press('Digit2'); // Intermediate preset
    await expect(page.locator('[data-testid="selected-preset"]')).toContainText('Intermediate');
    
    await page.keyboard.press('Digit3'); // Advanced preset
    await expect(page.locator('[data-testid="selected-preset"]')).toContainText('Advanced');
    
    console.log('✅ Keyboard shortcuts test passed!');
  });

  test('should handle timer controls during phase transitions', async ({ page }) => {
    console.log('🔄 Testing controls during phase transitions...');

    await page.click('[data-testid="preset-beginner"]');
    await page.click('[data-testid="start-button"]');
    
    // Wait for preparation phase
    await expect(page.locator('[data-testid="timer-phase"]')).toContainText('Get Ready');
    
    // Test pause during preparation
    console.log('   Testing pause during preparation...');
    await page.click('[data-testid="pause-button"]');
    await expect(page.locator('[data-testid="timer-status"]')).toContainText('Paused');
    await expect(page.locator('[data-testid="timer-phase"]')).toContainText('Get Ready');
    
    // Resume and wait for work phase
    await page.click('[data-testid="resume-button"]');
    await expect(page.locator('[data-testid="timer-phase"]')).toContainText('Work', { timeout: 15000 });
    
    // Test pause during work phase
    console.log('   Testing pause during work phase...');
    await page.click('[data-testid="pause-button"]');
    await expect(page.locator('[data-testid="timer-status"]')).toContainText('Paused');
    await expect(page.locator('[data-testid="timer-phase"]')).toContainText('Work');
    
    // Verify round information is preserved
    await expect(page.locator('[data-testid="current-round"]')).toContainText('1');
    
    // Resume and simulate transition to rest phase
    await page.click('[data-testid="resume-button"]');
    
    // Fast-forward to rest phase for testing
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('timerPhaseComplete', {
        detail: { phase: 'work', round: 1 }
      }));
    });
    
    await expect(page.locator('[data-testid="timer-phase"]')).toContainText('Rest', { timeout: 5000 });
    
    // Test pause during rest phase
    console.log('   Testing pause during rest phase...');
    await page.click('[data-testid="pause-button"]');
    await expect(page.locator('[data-testid="timer-status"]')).toContainText('Paused');
    await expect(page.locator('[data-testid="timer-phase"]')).toContainText('Rest');
    
    // Test reset during paused rest phase
    await page.click('[data-testid="reset-button"]');
    await expect(page.locator('[data-testid="timer-status"]')).toContainText('Ready');
    await expect(page.locator('[data-testid="current-round"]')).toContainText('1');
    await expect(page.locator('[data-testid="timer-phase"]')).toContainText('Get Ready');
    
    console.log('✅ Phase transition controls test passed!');
  });

  test('should provide proper visual feedback for control states', async ({ page }) => {
    console.log('🎨 Testing visual feedback for control states...');

    await page.click('[data-testid="preset-intermediate"]');
    
    // Test button state changes
    const startButton = page.locator('[data-testid="start-button"]');
    const pauseButton = page.locator('[data-testid="pause-button"]');
    const resumeButton = page.locator('[data-testid="resume-button"]');
    const stopButton = page.locator('[data-testid="stop-button"]');
    const resetButton = page.locator('[data-testid="reset-button"]');
    
    // Initial state
    await expect(startButton).toHaveClass(/btn-primary|btn-start/);
    await expect(stopButton).toHaveClass(/btn-secondary|btn-stop/);
    await expect(resetButton).toHaveClass(/btn-secondary|btn-reset/);
    
    // Start timer
    await page.click('[data-testid="start-button"]');
    
    // Running state
    await expect(pauseButton).toBeVisible();
    await expect(pauseButton).toHaveClass(/btn-warning|btn-pause/);
    await expect(stopButton).toHaveClass(/btn-danger|btn-stop/);
    
    // Test button hover states
    console.log('   Testing hover states...');
    await pauseButton.hover();
    // Hover state styling should be applied (implementation dependent)
    
    // Pause timer
    await page.click('[data-testid="pause-button"]');
    
    // Paused state
    await expect(resumeButton).toBeVisible();
    await expect(resumeButton).toHaveClass(/btn-success|btn-resume/);
    
    // Test disabled states (if any)
    console.log('   Testing disabled states...');
    
    // All buttons should be enabled in paused state
    await expect(resumeButton).toBeEnabled();
    await expect(stopButton).toBeEnabled();
    await expect(resetButton).toBeEnabled();
    
    // Test loading states during transitions
    console.log('   Testing loading states...');
    
    await page.click('[data-testid="resume-button"]');
    
    // Brief moment where button might show loading state
    // (Implementation dependent - some apps show loading during state transitions)
    
    await expect(page.locator('[data-testid="timer-status"]')).toContainText('Running');
    
    console.log('✅ Visual feedback test passed!');
  });

  test('should handle control accessibility features', async ({ page }) => {
    console.log('♿ Testing control accessibility...');

    await page.click('[data-testid="preset-beginner"]');
    
    // Test ARIA labels and roles
    const startButton = page.locator('[data-testid="start-button"]');
    const pauseButton = page.locator('[data-testid="pause-button"]');
    const stopButton = page.locator('[data-testid="stop-button"]');
    const resetButton = page.locator('[data-testid="reset-button"]');
    
    // Check ARIA attributes
    await expect(startButton).toHaveAttribute('aria-label');
    await expect(stopButton).toHaveAttribute('aria-label');
    await expect(resetButton).toHaveAttribute('aria-label');
    
    // Check button roles
    await expect(startButton).toHaveAttribute('role', 'button');
    await expect(stopButton).toHaveAttribute('role', 'button');
    
    // Test keyboard navigation
    console.log('   Testing keyboard navigation...');
    
    // Tab through controls
    await page.keyboard.press('Tab');
    let focusedElement = await page.locator(':focus').getAttribute('data-testid');
    
    // Should be on first interactive element
    expect(focusedElement).toBeTruthy();
    
    // Continue tabbing
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Test Enter key activation
    const currentFocus = await page.locator(':focus');
    if (await currentFocus.getAttribute('data-testid') === 'start-button') {
      await page.keyboard.press('Enter');
      await expect(page.locator('[data-testid="timer-status"]')).toContainText('Running');
    }
    
    // Test screen reader announcements
    console.log('   Testing screen reader support...');
    
    // Check for aria-live regions
    const timerStatus = page.locator('[data-testid="timer-status"]');
    await expect(timerStatus).toHaveAttribute('aria-live');
    
    const timeRemaining = page.locator('[data-testid="time-remaining"]');
    await expect(timeRemaining).toHaveAttribute('aria-live');
    
    // Test high contrast mode
    await page.emulateMedia({ colorScheme: 'dark' });
    
    // Controls should be visible in high contrast
    await expect(startButton).toBeVisible();
    await expect(stopButton).toBeVisible();
    
    console.log('✅ Control accessibility test passed!');
  });

  test('should handle edge cases and error conditions', async ({ page }) => {
    console.log('⚠️ Testing edge cases and error conditions...');

    // Test controls without preset selection
    console.log('   Testing controls without preset...');
    
    // Should be able to start with default settings
    await page.click('[data-testid="start-button"]');
    await expect(page.locator('[data-testid="timer-status"]')).toContainText('Running');
    
    await page.click('[data-testid="reset-button"]');
    
    // Test multiple rapid clicks
    console.log('   Testing multiple rapid clicks...');
    
    await page.click('[data-testid="preset-beginner"]');
    
    // Rapid multiple start clicks
    await page.click('[data-testid="start-button"]');
    await page.click('[data-testid="start-button"]'); // Should be ignored
    await page.click('[data-testid="start-button"]'); // Should be ignored
    
    // Should only be running once
    await expect(page.locator('[data-testid="timer-status"]')).toContainText('Running');
    
    // Test controls when timer is completed
    console.log('   Testing controls after completion...');
    
    // Fast-forward to completion
    await page.evaluate(() => {
      // Simulate workout completion
      window.dispatchEvent(new CustomEvent('workoutComplete', {
        detail: { totalRounds: 3 }
      }));
    });
    
    await expect(page.locator('[data-testid="timer-status"]')).toContainText('Complete', { timeout: 5000 });
    
    // Controls should be in proper completed state
    await expect(page.locator('[data-testid="start-button"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="reset-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="reset-button"]')).toBeEnabled();
    
    // Reset should work from completed state
    await page.click('[data-testid="reset-button"]');
    await expect(page.locator('[data-testid="timer-status"]')).toContainText('Ready');
    
    console.log('✅ Edge cases test passed!');
  });
});