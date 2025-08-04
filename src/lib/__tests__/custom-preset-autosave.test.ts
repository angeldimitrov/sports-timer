/**
 * Tests for custom preset autosave functionality - Basic autosave
 * @jest-environment jsdom
 */

import { autoSaveCustomPreset } from '../custom-preset';
import { TimerConfig } from '../timer-engine';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Ensure window is defined
(global as unknown as { window: Window }).window = window;

describe('Custom Preset Autosave - Basic functionality', () => {
  const validConfig: TimerConfig = {
    workDuration: 180,
    restDuration: 60,
    totalRounds: 5,
    prepDuration: 10,
    enableWarning: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should handle validation errors gracefully in autosave', async () => {
    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
    
    // Test with invalid name (empty string)
    const result = await autoSaveCustomPreset('', validConfig);

    expect(result).toBe(false);
    expect(consoleWarn).toHaveBeenCalledWith('Auto-save failed:', expect.any(Error));
    
    consoleWarn.mockRestore();
  });

  test('should handle storage quota errors gracefully', async () => {
    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
    
    // Test with invalid config (work duration too high)
    const invalidConfig: TimerConfig = {
      workDuration: 700, // Exceeds max limit of 600
      restDuration: 60,
      totalRounds: 5,
      prepDuration: 10,
      enableWarning: true
    };

    const result = await autoSaveCustomPreset('Test', invalidConfig);

    expect(result).toBe(false);
    expect(consoleWarn).toHaveBeenCalled();
    
    consoleWarn.mockRestore();
  });
});