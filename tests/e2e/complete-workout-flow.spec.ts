/**
 * Complete Workout Flow E2E Test
 * 
 * Tests the full end-to-end user journey of completing a boxing workout using
 * the timer application. This test validates the complete business workflow
 * from preset selection through workout completion.
 * 
 * Test Coverage:
 * - Preset selection and configuration
 * - Timer initialization and startup
 * - Phase progression (preparation → work → rest → complete)
 * - Audio cue integration
 * - Visual feedback and state changes
 * - Workout completion and celebration
 * 
 * Business Critical: This test ensures the core user experience works correctly
 * for boxing athletes completing their training sessions.
 */

import { test, expect } from '@playwright/test';

test.describe('Complete Workout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for application to load
    await page.waitForLoadState('networkidle');
    
    // Ensure audio permissions (if needed)
    await page.evaluate(() => {
      // Simulate user interaction to enable audio
      return new Promise<void>((resolve) => {
        document.addEventListener('click', () => resolve(), { once: true });
        document.body.click();
      });
    });
  });

  test('should complete a beginner workout from start to finish', async ({ page }) => {
    console.log('🥊 Starting Complete Beginner Workout Test...');

    // Step 1: Select beginner preset
    console.log('📋 Selecting beginner preset...');
    await page.click('[data-testid="preset-beginner"]');
    
    // Verify preset configuration is applied
    const workDuration = await page.textContent('[data-testid="work-duration-display"]');
    const restDuration = await page.textContent('[data-testid="rest-duration-display"]');
    const totalRounds = await page.textContent('[data-testid="total-rounds-display"]');
    
    expect(workDuration).toContain('2:00'); // 2 minutes work
    expect(restDuration).toContain('1:00'); // 1 minute rest
    expect(totalRounds).toContain('3'); // 3 rounds

    // Step 2: Start workout
    console.log('▶️ Starting workout...');
    await page.click('[data-testid="start-button"]');
    
    // Verify timer starts in preparation phase
    await expect(page.locator('[data-testid="timer-phase"]')).toContainText('Get Ready');
    await expect(page.locator('[data-testid="timer-status"]')).toContainText('Running');
    
    // Verify preparation countdown
    const prepTime = await page.textContent('[data-testid="time-remaining"]');
    expect(prepTime).toMatch(/0:0[0-9]/); // Should show 10 seconds or less

    // Step 3: Wait for preparation to complete and work phase to start
    console.log('⏱️ Waiting for work phase to begin...');
    await expect(page.locator('[data-testid="timer-phase"]')).toContainText('Work', { timeout: 15000 });
    await expect(page.locator('[data-testid="current-round"]')).toContainText('1');
    
    // Verify work phase timer shows correct duration
    const workTime = await page.textContent('[data-testid="time-remaining"]');
    expect(workTime).toMatch(/2:0[0-9]|1:[0-5][0-9]/); // Should be around 2 minutes

    // Step 4: Simulate fast-forward through first work period (for testing speed)
    console.log('⏩ Fast-forwarding through work period...');
    await page.evaluate(() => {
      // Simulate timer completion by triggering worker message
      const event = new CustomEvent('timerPhaseComplete', {
        detail: { phase: 'work', round: 1 }
      });
      window.dispatchEvent(event);
    });

    // Step 5: Verify transition to rest phase
    console.log('😴 Validating rest phase...');
    await expect(page.locator('[data-testid="timer-phase"]')).toContainText('Rest', { timeout: 5000 });
    
    const restTime = await page.textContent('[data-testid="time-remaining"]');
    expect(restTime).toMatch(/1:0[0-9]|0:[0-5][0-9]/); // Should be around 1 minute

    // Step 6: Complete multiple rounds
    console.log('🔄 Completing multiple rounds...');
    
    for (let round = 1; round <= 3; round++) {
      console.log(`   Round ${round}...`);
      
      // Verify current round display
      await expect(page.locator('[data-testid="current-round"]')).toContainText(round.toString());
      
      // Fast-forward through work phase
      if (round <= 3) {
        await page.evaluate((currentRound) => {
          const workEvent = new CustomEvent('timerPhaseComplete', {
            detail: { phase: 'work', round: currentRound }
          });
          window.dispatchEvent(workEvent);
        }, round);
        
        // For rounds 1-2, also fast-forward through rest
        if (round < 3) {
          await expect(page.locator('[data-testid="timer-phase"]')).toContainText('Rest', { timeout: 2000 });
          
          await page.evaluate((currentRound) => {
            const restEvent = new CustomEvent('timerPhaseComplete', {
              detail: { phase: 'rest', round: currentRound }
            });
            window.dispatchEvent(restEvent);
          }, round);
        }
      }
    }

    // Step 7: Verify workout completion
    console.log('🎉 Validating workout completion...');
    await expect(page.locator('[data-testid="timer-status"]')).toContainText('Complete', { timeout: 5000 });
    await expect(page.locator('[data-testid="workout-complete-message"]')).toBeVisible();
    
    // Verify completion statistics
    const completedRounds = await page.textContent('[data-testid="completed-rounds"]');
    expect(completedRounds).toContain('3');
    
    const totalWorkoutTime = await page.textContent('[data-testid="total-workout-time"]');
    expect(totalWorkoutTime).toMatch(/[0-9]+:[0-9]+/); // Should show total time

    // Step 8: Verify reset functionality after completion
    console.log('🔄 Testing reset after completion...');
    await page.click('[data-testid="reset-button"]');
    
    await expect(page.locator('[data-testid="timer-status"]')).toContainText('Ready');
    await expect(page.locator('[data-testid="current-round"]')).toContainText('1');
    await expect(page.locator('[data-testid="timer-phase"]')).toContainText('Get Ready');

    console.log('✅ Complete Beginner Workout Test Passed!');
  });

  test('should handle workout interruption and resumption', async ({ page }) => {
    console.log('⏸️ Testing workout interruption and resumption...');

    // Start a workout
    await page.click('[data-testid="preset-intermediate"]');
    await page.click('[data-testid="start-button"]');
    
    // Wait for preparation to complete and work to start
    await expect(page.locator('[data-testid="timer-phase"]')).toContainText('Work', { timeout: 15000 });
    
    // Pause the workout
    console.log('⏸️ Pausing workout...');
    await page.click('[data-testid="pause-button"]');
    
    await expect(page.locator('[data-testid="timer-status"]')).toContainText('Paused');
    
    // Verify time remaining is preserved
    const pausedTime = await page.textContent('[data-testid="time-remaining"]');
    
    // Wait a moment and verify time doesn't change
    await page.waitForTimeout(2000);
    const stillPausedTime = await page.textContent('[data-testid="time-remaining"]');
    expect(stillPausedTime).toBe(pausedTime);
    
    // Resume the workout
    console.log('▶️ Resuming workout...');
    await page.click('[data-testid="resume-button"]');
    
    await expect(page.locator('[data-testid="timer-status"]')).toContainText('Running');
    
    // Verify timer continues from where it left off
    const resumedTime = await page.textContent('[data-testid="time-remaining"]');
    expect(resumedTime).toBe(pausedTime); // Should resume from same time
    
    console.log('✅ Workout interruption test passed!');
  });

  test('should display proper workout progress throughout session', async ({ page }) => {
    console.log('📊 Testing workout progress tracking...');

    // Start beginner workout (3 rounds, easier to track)
    await page.click('[data-testid="preset-beginner"]');
    await page.click('[data-testid="start-button"]');
    
    // Track progress values throughout workout
    const progressValues: number[] = [];
    
    // Function to capture current progress
    const captureProgress = async () => {
      const progressText = await page.textContent('[data-testid="workout-progress"]');
      const progressMatch = progressText?.match(/(\d+)%/);
      if (progressMatch) {
        progressValues.push(parseInt(progressMatch[1]));
      }
    };

    // Capture initial progress (should be 0% or very low)
    await captureProgress();
    expect(progressValues[0]).toBeLessThanOrEqual(10);

    // Fast-forward through phases and capture progress
    console.log('⏩ Tracking progress through workout phases...');
    
    // Complete preparation
    await expect(page.locator('[data-testid="timer-phase"]')).toContainText('Work', { timeout: 15000 });
    await captureProgress();
    
    // Complete round 1 work
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('timerPhaseComplete', {
        detail: { phase: 'work', round: 1 }
      }));
    });
    
    await expect(page.locator('[data-testid="timer-phase"]')).toContainText('Rest');
    await captureProgress();
    
    // Complete round 1 rest
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('timerPhaseComplete', {
        detail: { phase: 'rest', round: 1 }
      }));
    });
    
    await captureProgress();
    
    // Verify progress increases monotonically
    for (let i = 1; i < progressValues.length; i++) {
      expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i - 1]);
    }
    
    console.log(`📈 Progress values: ${progressValues.join('% → ')}%`);
    console.log('✅ Workout progress tracking test passed!');
  });

  test('should handle custom timer settings', async ({ page }) => {
    console.log('⚙️ Testing custom timer settings...');

    // Open settings dialog
    await page.click('[data-testid="settings-button"]');
    await expect(page.locator('[data-testid="settings-dialog"]')).toBeVisible();
    
    // Configure custom settings
    await page.fill('[data-testid="work-duration-input"]', '30'); // 30 seconds for testing
    await page.fill('[data-testid="rest-duration-input"]', '15'); // 15 seconds
    await page.fill('[data-testid="total-rounds-input"]', '2'); // 2 rounds
    await page.click('[data-testid="enable-warning-checkbox"]'); // Enable warnings
    
    // Save settings
    await page.click('[data-testid="save-settings-button"]');
    
    // Verify settings are applied
    await expect(page.locator('[data-testid="work-duration-display"]')).toContainText('0:30');
    await expect(page.locator('[data-testid="rest-duration-display"]')).toContainText('0:15');
    await expect(page.locator('[data-testid="total-rounds-display"]')).toContainText('2');
    
    // Start workout with custom settings
    await page.click('[data-testid="start-button"]');
    
    // Wait for work phase (preparation should be quick)
    await expect(page.locator('[data-testid="timer-phase"]')).toContainText('Work', { timeout: 15000 });
    
    // Verify work duration is correct
    const workTime = await page.textContent('[data-testid="time-remaining"]');
    expect(workTime).toMatch(/0:3[0-9]|0:2[0-9]/); // Should be around 30 seconds
    
    console.log('✅ Custom timer settings test passed!');
  });

  test('should provide audio feedback during workout phases', async ({ page }) => {
    console.log('🔊 Testing audio feedback system...');

    // Mock audio system for testing
    await page.addInitScript(() => {
      // Mock audio events for testing
      let audioEvents: string[] = [];
      
      window.mockAudioEvents = audioEvents;
      
      // Mock audio manager
      window.AudioManager = {
        playRoundStart: () => audioEvents.push('roundStart'),
        playRoundEnd: () => audioEvents.push('roundEnd'),
        playTenSecondWarning: () => audioEvents.push('tenSecondWarning'),
        playGetReady: () => audioEvents.push('getReady'),
        playRest: () => audioEvents.push('rest'),
        playWorkoutComplete: () => audioEvents.push('workoutComplete'),
      };
    });

    // Start a quick workout
    await page.click('[data-testid="preset-beginner"]');
    await page.click('[data-testid="start-button"]');
    
    // Monitor for audio events
    let audioEvents = await page.evaluate(() => window.mockAudioEvents || []);
    
    // Should have preparation audio
    expect(audioEvents).toContain('getReady');
    
    // Wait for work phase
    await expect(page.locator('[data-testid="timer-phase"]')).toContainText('Work', { timeout: 15000 });
    
    audioEvents = await page.evaluate(() => window.mockAudioEvents || []);
    expect(audioEvents).toContain('roundStart');
    
    // Complete work phase
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('timerPhaseComplete', {
        detail: { phase: 'work', round: 1 }
      }));
    });
    
    // Should have rest audio
    await expect(page.locator('[data-testid="timer-phase"]')).toContainText('Rest');
    
    audioEvents = await page.evaluate(() => window.mockAudioEvents || []);
    expect(audioEvents).toContain('roundEnd');
    expect(audioEvents).toContain('rest');
    
    console.log(`🎵 Audio events captured: ${audioEvents.join(', ')}`);
    console.log('✅ Audio feedback test passed!');
  });
});