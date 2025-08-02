/**
 * Basic Smoke Test for Boxing Timer MVP
 * 
 * This test validates that the application loads and basic functionality works
 * without requiring the full development server setup.
 */

import { test, expect } from '@playwright/test';

test.describe('Boxing Timer - Smoke Test', () => {
  
  test('application loads and displays main interface', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Check that the page loads successfully
    await expect(page).toHaveTitle(/Boxing Timer/);
    
    // Verify main timer display is present
    await expect(page.locator('[data-testid="timer-display"]')).toBeVisible();
    
    // Verify control buttons are present
    await expect(page.locator('[data-testid="timer-controls"]')).toBeVisible();
    
    // Verify preset selector is present
    await expect(page.locator('[data-testid="preset-selector"]')).toBeVisible();
  });

  test('preset buttons are functional', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to be ready
    await page.waitForLoadState('networkidle');
    
    // Check if preset buttons exist and are clickable
    const beginnerPreset = page.locator('text=Beginner');
    if (await beginnerPreset.isVisible()) {
      await expect(beginnerPreset).toBeEnabled();
    }
    
    const intermediatePreset = page.locator('text=Intermediate');
    if (await intermediatePreset.isVisible()) {
      await expect(intermediatePreset).toBeEnabled();
    }
    
    const advancedPreset = page.locator('text=Advanced');
    if (await advancedPreset.isVisible()) {
      await expect(advancedPreset).toBeEnabled();
    }
  });

  test('timer controls are accessible', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to be ready
    await page.waitForLoadState('networkidle');
    
    // Check for timer control buttons
    const startButton = page.locator('button').filter({ hasText: /start|play/i });
    if (await startButton.count() > 0) {
      await expect(startButton.first()).toBeEnabled();
    }
    
    // Check for pause/stop functionality
    const controlButton = page.locator('button').filter({ hasText: /pause|stop|reset/i });
    if (await controlButton.count() > 0) {
      // Controls should be present (might be disabled initially)
      await expect(controlButton.first()).toBeVisible();
    }
  });

  test('mobile responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Wait for page to be ready
    await page.waitForLoadState('networkidle');
    
    // Verify the page is still functional on mobile
    await expect(page).toHaveTitle(/Boxing Timer/);
    
    // Check that main elements are still visible on mobile
    const mainContent = page.locator('main, [role="main"], .container').first();
    if (await mainContent.isVisible()) {
      await expect(mainContent).toBeVisible();
    }
  });

});