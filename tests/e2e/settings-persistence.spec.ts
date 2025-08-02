/**
 * Settings Persistence E2E Test
 * 
 * Tests the complete settings management system including storage persistence,
 * configuration validation, and settings restoration across browser sessions.
 * 
 * Test Coverage:
 * - Settings dialog functionality and validation
 * - LocalStorage persistence across page reloads
 * - Configuration import/export capabilities
 * - Default settings restoration
 * - Edge cases and error handling
 * 
 * Business Critical: Boxing athletes need their custom timer settings to persist
 * across training sessions. Settings must survive browser restarts and be
 * easily backed up or shared between devices.
 */

import { test, expect } from '@playwright/test';

test.describe('Settings Persistence', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for application to load
    await page.waitForLoadState('networkidle');
    
    // Clear any existing settings for clean test environment
    await page.evaluate(() => {
      localStorage.clear();
    });
    
    // Reload to ensure clean state
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('should save and restore custom timer settings across page reloads', async ({ page }) => {
    console.log('💾 Testing settings persistence across reloads...');

    // Open settings dialog
    await page.click('[data-testid="settings-button"]');
    await expect(page.locator('[data-testid="settings-dialog"]')).toBeVisible();
    
    // Configure custom settings
    const customSettings = {
      workDuration: 45, // 45 seconds
      restDuration: 20, // 20 seconds
      totalRounds: 7,   // 7 rounds
      prepDuration: 15, // 15 seconds prep
      enableWarning: true,
      enableAudio: true,
      volume: 85
    };
    
    console.log('⚙️ Configuring custom settings...');
    await page.fill('[data-testid="work-duration-input"]', customSettings.workDuration.toString());
    await page.fill('[data-testid="rest-duration-input"]', customSettings.restDuration.toString());
    await page.fill('[data-testid="total-rounds-input"]', customSettings.totalRounds.toString());
    await page.fill('[data-testid="prep-duration-input"]', customSettings.prepDuration.toString());
    
    // Set checkbox states
    if (customSettings.enableWarning) {
      await page.check('[data-testid="enable-warning-checkbox"]');
    }
    if (customSettings.enableAudio) {
      await page.check('[data-testid="enable-audio-checkbox"]');
    }
    
    // Set volume slider
    const volumeSlider = page.locator('[data-testid="volume-slider"]');
    await volumeSlider.fill(customSettings.volume.toString());
    
    // Save settings
    await page.click('[data-testid="save-settings-button"]');
    
    // Verify settings are applied immediately
    await expect(page.locator('[data-testid="work-duration-display"]')).toContainText('0:45');
    await expect(page.locator('[data-testid="rest-duration-display"]')).toContainText('0:20');
    await expect(page.locator('[data-testid="total-rounds-display"]')).toContainText('7');
    
    // Verify settings are stored in localStorage
    const storedSettings = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('boxing-timer-settings') || '{}');
    });
    
    expect(storedSettings.workDuration).toBe(customSettings.workDuration);
    expect(storedSettings.restDuration).toBe(customSettings.restDuration);
    expect(storedSettings.totalRounds).toBe(customSettings.totalRounds);
    
    console.log('🔄 Reloading page to test persistence...');
    
    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verify settings are restored after reload
    await expect(page.locator('[data-testid="work-duration-display"]')).toContainText('0:45');
    await expect(page.locator('[data-testid="rest-duration-display"]')).toContainText('0:20');
    await expect(page.locator('[data-testid="total-rounds-display"]')).toContainText('7');
    
    // Open settings dialog to verify all values are restored
    await page.click('[data-testid="settings-button"]');
    
    const workValue = await page.inputValue('[data-testid="work-duration-input"]');
    const restValue = await page.inputValue('[data-testid="rest-duration-input"]');
    const roundsValue = await page.inputValue('[data-testid="total-rounds-input"]');
    const prepValue = await page.inputValue('[data-testid="prep-duration-input"]');
    
    expect(parseInt(workValue)).toBe(customSettings.workDuration);
    expect(parseInt(restValue)).toBe(customSettings.restDuration);
    expect(parseInt(roundsValue)).toBe(customSettings.totalRounds);
    expect(parseInt(prepValue)).toBe(customSettings.prepDuration);
    
    // Verify checkbox states
    const warningChecked = await page.isChecked('[data-testid="enable-warning-checkbox"]');
    const audioChecked = await page.isChecked('[data-testid="enable-audio-checkbox"]');
    
    expect(warningChecked).toBe(customSettings.enableWarning);
    expect(audioChecked).toBe(customSettings.enableAudio);
    
    console.log('✅ Settings persistence test passed!');
  });

  test('should handle settings validation and error cases', async ({ page }) => {
    console.log('⚠️ Testing settings validation...');

    // Open settings dialog
    await page.click('[data-testid="settings-button"]');
    
    // Test invalid work duration (too short)
    await page.fill('[data-testid="work-duration-input"]', '5'); // 5 seconds (too short)
    
    const workInput = page.locator('[data-testid="work-duration-input"]');
    await expect(workInput).toHaveAttribute('aria-invalid', 'true');
    
    // Verify error message is shown
    await expect(page.locator('[data-testid="work-duration-error"]')).toContainText('minimum');
    
    // Test invalid work duration (too long)
    await page.fill('[data-testid="work-duration-input"]', '900'); // 15 minutes (too long)
    await expect(page.locator('[data-testid="work-duration-error"]')).toContainText('maximum');
    
    // Test invalid rest duration
    await page.fill('[data-testid="rest-duration-input"]', '0');
    await expect(page.locator('[data-testid="rest-duration-error"]')).toBeVisible();
    
    // Test invalid rounds count
    await page.fill('[data-testid="total-rounds-input"]', '25'); // Too many rounds
    await expect(page.locator('[data-testid="total-rounds-error"]')).toContainText('maximum');
    
    await page.fill('[data-testid="total-rounds-input"]', '0'); // Too few rounds
    await expect(page.locator('[data-testid="total-rounds-error"]')).toContainText('minimum');
    
    // Save button should be disabled with invalid settings
    const saveButton = page.locator('[data-testid="save-settings-button"]');
    await expect(saveButton).toBeDisabled();
    
    // Fix settings to valid values
    await page.fill('[data-testid="work-duration-input"]', '120'); // 2 minutes
    await page.fill('[data-testid="rest-duration-input"]', '60');  // 1 minute
    await page.fill('[data-testid="total-rounds-input"]', '5');    // 5 rounds
    
    // Save button should be enabled now
    await expect(saveButton).toBeEnabled();
    
    console.log('✅ Settings validation test passed!');
  });

  test('should support settings export and import functionality', async ({ page }) => {
    console.log('📤 Testing settings export/import...');

    // Configure custom settings first
    await page.click('[data-testid="settings-button"]');
    
    await page.fill('[data-testid="work-duration-input"]', '90');
    await page.fill('[data-testid="rest-duration-input"]', '45');
    await page.fill('[data-testid="total-rounds-input"]', '8');
    await page.check('[data-testid="enable-warning-checkbox"]');
    
    await page.click('[data-testid="save-settings-button"]');
    
    // Export settings
    console.log('📤 Exporting settings...');
    await page.click('[data-testid="settings-button"]');
    
    // Mock file download for export
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-settings-button"]');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/boxing-timer-settings.*\.json/);
    
    // Get exported settings content
    const exportedPath = await download.path();
    const fs = require('fs');
    const exportedContent = fs.readFileSync(exportedPath, 'utf8');
    const exportedSettings = JSON.parse(exportedContent);
    
    expect(exportedSettings.workDuration).toBe(90);
    expect(exportedSettings.restDuration).toBe(45);
    expect(exportedSettings.totalRounds).toBe(8);
    expect(exportedSettings.enableWarning).toBe(true);
    
    // Clear current settings
    console.log('🗑️ Clearing settings for import test...');
    await page.click('[data-testid="reset-settings-button"]');
    
    // Verify settings are reset to defaults
    await expect(page.locator('[data-testid="work-duration-display"]')).toContainText('3:00'); // Default 3 minutes
    
    // Import settings
    console.log('📥 Importing settings...');
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[data-testid="import-settings-button"]');
    
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(exportedPath);
    
    // Verify imported settings are applied
    await expect(page.locator('[data-testid="work-duration-display"]')).toContainText('1:30'); // 90 seconds
    await expect(page.locator('[data-testid="rest-duration-display"]')).toContainText('0:45'); // 45 seconds
    await expect(page.locator('[data-testid="total-rounds-display"]')).toContainText('8');
    
    console.log('✅ Settings export/import test passed!');
  });

  test('should handle settings migration and version compatibility', async ({ page }) => {
    console.log('🔄 Testing settings migration...');

    // Simulate old version settings in localStorage
    await page.evaluate(() => {
      // Old format settings (v1.0)
      const oldSettings = {
        version: '1.0',
        work: 180, // Old property names
        rest: 60,
        rounds: 5,
        warning: true,
        // Missing new properties
      };
      
      localStorage.setItem('boxing-timer-config', JSON.stringify(oldSettings)); // Old key
    });
    
    // Reload page to trigger migration
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verify migration occurred
    const migratedSettings = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('boxing-timer-settings') || '{}');
    });
    
    expect(migratedSettings.workDuration).toBe(180); // Migrated to new property name
    expect(migratedSettings.restDuration).toBe(60);
    expect(migratedSettings.totalRounds).toBe(5);
    expect(migratedSettings.enableWarning).toBe(true);
    expect(migratedSettings.version).toBeTruthy(); // Should have current version
    
    // Verify UI shows migrated settings
    await expect(page.locator('[data-testid="work-duration-display"]')).toContainText('3:00');
    await expect(page.locator('[data-testid="rest-duration-display"]')).toContainText('1:00');
    await expect(page.locator('[data-testid="total-rounds-display"]')).toContainText('5');
    
    console.log('✅ Settings migration test passed!');
  });

  test('should restore default settings when requested', async ({ page }) => {
    console.log('🔄 Testing default settings restoration...');

    // Configure custom settings first
    await page.click('[data-testid="settings-button"]');
    
    await page.fill('[data-testid="work-duration-input"]', '30');
    await page.fill('[data-testid="rest-duration-input"]', '10');
    await page.fill('[data-testid="total-rounds-input"]', '2');
    await page.uncheck('[data-testid="enable-warning-checkbox"]');
    
    await page.click('[data-testid="save-settings-button"]');
    
    // Verify custom settings are applied
    await expect(page.locator('[data-testid="work-duration-display"]')).toContainText('0:30');
    await expect(page.locator('[data-testid="total-rounds-display"]')).toContainText('2');
    
    // Reset to defaults
    await page.click('[data-testid="settings-button"]');
    await page.click('[data-testid="reset-to-defaults-button"]');
    
    // Verify confirmation dialog
    await expect(page.locator('[data-testid="confirm-reset-dialog"]')).toBeVisible();
    await page.click('[data-testid="confirm-reset-button"]');
    
    // Verify default settings are restored
    await expect(page.locator('[data-testid="work-duration-display"]')).toContainText('3:00'); // Default 3 minutes
    await expect(page.locator('[data-testid="rest-duration-display"]')).toContainText('1:00'); // Default 1 minute
    await expect(page.locator('[data-testid="total-rounds-display"]')).toContainText('5'); // Default 5 rounds
    
    // Verify localStorage is cleared of custom settings
    const clearedSettings = await page.evaluate(() => {
      return localStorage.getItem('boxing-timer-settings');
    });
    
    expect(clearedSettings).toBeNull();
    
    console.log('✅ Default settings restoration test passed!');
  });

  test('should handle corrupt settings data gracefully', async ({ page }) => {
    console.log('🛠️ Testing corrupt settings handling...');

    // Inject corrupt settings data
    await page.evaluate(() => {
      // Invalid JSON
      localStorage.setItem('boxing-timer-settings', '{invalid json}');
    });
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should fall back to default settings
    await expect(page.locator('[data-testid="work-duration-display"]')).toContainText('3:00');
    
    // Test with valid JSON but invalid values
    await page.evaluate(() => {
      const corruptSettings = {
        workDuration: 'invalid',
        restDuration: -50,
        totalRounds: 'not a number',
        enableWarning: 'maybe',
        volume: 150 // Out of range
      };
      localStorage.setItem('boxing-timer-settings', JSON.stringify(corruptSettings));
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should still use defaults when data is corrupt
    await expect(page.locator('[data-testid="work-duration-display"]')).toContainText('3:00');
    
    // Open settings to verify defaults are loaded
    await page.click('[data-testid="settings-button"]');
    
    const workValue = await page.inputValue('[data-testid="work-duration-input"]');
    expect(parseInt(workValue)).toBeGreaterThan(0);
    expect(parseInt(workValue)).toBeLessThan(600); // Reasonable default
    
    console.log('✅ Corrupt settings handling test passed!');
  });

  test('should maintain settings consistency during concurrent modifications', async ({ page, context }) => {
    console.log('🔄 Testing concurrent settings modifications...');

    // Configure initial settings
    await page.click('[data-testid="settings-button"]');
    await page.fill('[data-testid="work-duration-input"]', '60');
    await page.click('[data-testid="save-settings-button"]');
    
    // Open a second tab/context
    const secondPage = await context.newPage();
    await secondPage.goto('/');
    await secondPage.waitForLoadState('networkidle');
    
    // Verify second tab has same settings
    await expect(secondPage.locator('[data-testid="work-duration-display"]')).toContainText('1:00');
    
    // Modify settings in first tab
    await page.click('[data-testid="settings-button"]');
    await page.fill('[data-testid="work-duration-input"]', '90');
    await page.click('[data-testid="save-settings-button"]');
    
    // Modify different settings in second tab
    await secondPage.click('[data-testid="settings-button"]');
    await secondPage.fill('[data-testid="rest-duration-input"]', '30');
    await secondPage.click('[data-testid="save-settings-button"]');
    
    // Check final state in both tabs
    await page.reload();
    await secondPage.reload();
    
    await page.waitForLoadState('networkidle');
    await secondPage.waitForLoadState('networkidle');
    
    // Both should have consistent settings (last write wins)
    const firstTabWork = await page.textContent('[data-testid="work-duration-display"]');
    const secondTabWork = await secondPage.textContent('[data-testid="work-duration-display"]');
    
    const firstTabRest = await page.textContent('[data-testid="rest-duration-display"]');
    const secondTabRest = await secondPage.textContent('[data-testid="rest-duration-display"]');
    
    // Settings should be consistent between tabs
    expect(firstTabWork).toBe(secondTabWork);
    expect(firstTabRest).toBe(secondTabRest);
    
    await secondPage.close();
    
    console.log('✅ Concurrent modifications test passed!');
  });

  test('should preserve settings during application updates', async ({ page }) => {
    console.log('🔄 Testing settings preservation during updates...');

    // Set custom settings
    await page.click('[data-testid="settings-button"]');
    await page.fill('[data-testid="work-duration-input"]', '75');
    await page.fill('[data-testid="rest-duration-input"]', '25');
    await page.check('[data-testid="enable-warning-checkbox"]');
    await page.click('[data-testid="save-settings-button"]');
    
    // Simulate app update by changing version in localStorage
    await page.evaluate(() => {
      const settings = JSON.parse(localStorage.getItem('boxing-timer-settings') || '{}');
      settings.appVersion = '1.0.0'; // Simulate old version
      localStorage.setItem('boxing-timer-settings', JSON.stringify(settings));
    });
    
    // Reload to simulate app restart after update
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Settings should be preserved after update
    await expect(page.locator('[data-testid="work-duration-display"]')).toContainText('1:15');
    await expect(page.locator('[data-testid="rest-duration-display"]')).toContainText('0:25');
    
    // Version should be updated
    const updatedSettings = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('boxing-timer-settings') || '{}');
    });
    
    expect(updatedSettings.appVersion).not.toBe('1.0.0'); // Should be updated
    
    console.log('✅ Settings preservation during updates test passed!');
  });
});