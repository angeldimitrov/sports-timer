/**
 * Jest Configuration for Boxing Timer MVP
 * 
 * Configured for testing React components, TypeScript modules, and Web Worker functionality
 * with comprehensive coverage reporting and appropriate test environments.
 */

const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Custom Jest configuration
const customJestConfig = {
  // Test setup file
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Test environment for DOM testing
  testEnvironment: 'jest-environment-jsdom',
  
  // Module name mapping for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
  },
  
  // Test file patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(js|jsx|ts|tsx)',
    '<rootDir>/src/**/*.(test|spec).(js|jsx|ts|tsx)',
    '<rootDir>/tests/integration/**/*.(test|spec).(js|jsx|ts|tsx)',
  ],
  
  // Exclude Playwright E2E tests from Jest
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/tests/e2e/',
    '<rootDir>/.next/',
    '<rootDir>/coverage/',
  ],
  
  // File extensions to consider
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Transform configuration for TypeScript and JavaScript
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/index.{js,jsx,ts,tsx}',
    '!src/app/layout.tsx',
    '!src/app/globals.css',
  ],
  
  // Coverage thresholds - focused on critical components only
  coverageThreshold: {
    // Stricter requirements for critical components
    'src/lib/timer-engine.ts': {
      branches: 55,
      functions: 70,
      lines: 70,
      statements: 75,
    },
    'src/lib/audio-manager.ts': {
      branches: 60,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  
  // Test timeout for async operations
  testTimeout: 10000,
  
  // Mock Worker for Web Worker testing
  setupFiles: ['<rootDir>/jest.worker-mock.js'],
  
  // Verbose output for detailed test results
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Maximum worker processes for parallel execution
  maxWorkers: '50%',
  
  // Test result processor
  testResultsProcessor: undefined,
  
  // Global setup for performance testing
  globalSetup: undefined,
  globalTeardown: undefined,
}

// Export Jest config with Next.js integration
module.exports = createJestConfig(customJestConfig)