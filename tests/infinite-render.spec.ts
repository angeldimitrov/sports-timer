import { test, expect } from '@playwright/test';

test.describe('Timer Infinite Re-render Detection', () => {
  test('should not have infinite re-renders on page load', async ({ page }) => {
    // Collect console warnings
    const warnings: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'warning' && msg.text().includes('Maximum update depth exceeded')) {
        warnings.push(msg.text());
      }
    });

    // Navigate to the timer page
    await page.goto('http://localhost:3000');

    // Wait for the timer to be initialized
    await page.waitForSelector('[data-testid="timer-display"]', { timeout: 10000 });

    // Wait a bit to allow any potential infinite renders to manifest
    await page.waitForTimeout(3000);

    // Check that no infinite render warnings occurred
    expect(warnings.length).toBe(0);

    // Additional check: verify the timer display is stable
    const timerDisplay = page.locator('[data-testid="timer-display"]');
    await expect(timerDisplay).toBeVisible();
    
    // Check that the timer state is stable (not constantly updating)
    const initialText = await timerDisplay.textContent();
    await page.waitForTimeout(1000);
    const afterText = await timerDisplay.textContent();
    
    // Timer should be stable when idle (same text)
    expect(initialText).toBe(afterText);
  });

  test('should not have infinite re-renders when starting timer', async ({ page }) => {
    const warnings: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'warning' && msg.text().includes('Maximum update depth exceeded')) {
        warnings.push(msg.text());
      }
    });

    await page.goto('http://localhost:3000');
    await page.waitForSelector('[data-testid="timer-display"]');

    // Start the timer
    await page.click('[data-testid="start-button"]');
    
    // Wait to see if infinite renders occur
    await page.waitForTimeout(2000);

    // Stop the timer to prevent it from running during test
    await page.click('[data-testid="stop-button"]');

    expect(warnings.length).toBe(0);
  });
});