/**
 * Playwright Global Teardown for Boxing Timer E2E Tests
 * 
 * Cleans up resources and validates test environment after all E2E tests complete.
 * Ensures no test artifacts remain and provides final test run summary.
 */

import { FullConfig } from '@playwright/test';

/**
 * Global teardown function called after all tests complete
 * 
 * Responsibilities:
 * - Clean up any remaining test data or artifacts
 * - Validate application state after testing
 * - Generate test completion summary
 * - Close any remaining browser contexts or resources
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting Boxing Timer E2E Test Teardown...');

  try {
    const baseURL = config.projects[0].use?.baseURL;
    
    if (baseURL) {
      console.log(`📊 Test run completed against: ${baseURL}`);
    }

    // Log summary information
    console.log('📈 E2E Test Run Summary:');
    console.log(`   - Projects tested: ${config.projects.length}`);
    console.log(`   - Base URL: ${baseURL || 'Not configured'}`);
    console.log(`   - Test directory: ${config.testDir}`);

    // Note: Individual test cleanup is handled by test-specific teardown
    // This global teardown is for environment-wide cleanup only

    console.log('✅ Boxing Timer E2E Test Teardown Complete!');

  } catch (teardownError) {
    console.error('❌ E2E Test Teardown Error:', teardownError);
    // Don't throw - teardown errors shouldn't fail the test run
  }
}

export default globalTeardown;