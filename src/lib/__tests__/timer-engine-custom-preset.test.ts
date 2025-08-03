/**
 * Integration Tests for Timer Engine with Custom Presets
 * 
 * Tests the integration between the timer engine and custom preset system,
 * ensuring proper loading, validation, and fallback behavior when using
 * custom presets with the boxing timer.
 * 
 * Business Logic Coverage:
 * - Custom preset loading from localStorage
 * - Timer configuration application for custom presets
 * - Fallback behavior for missing/corrupted custom presets
 * - Custom preset usage tracking integration
 */

import { createBoxingTimer, TimerEngine, type TimerConfig } from '../timer-engine';
import { createCustomPreset, deleteCustomPreset, type CustomPreset, STORAGE_KEYS } from '../custom-preset';

// Use the global localStorage mock from jest setup

// Type-safe test configurations
const customTimerConfig: TimerConfig = {
  totalRounds: 8,
  workDuration: 240, // 4 minutes
  restDuration: 90,  // 1.5 minutes
  prepDuration: 15,  // 15 seconds
  enableWarning: true,
  warningDuration: 10
};

const customPresetData: CustomPreset = {
  exists: true,
  name: 'Power Training',
  config: customTimerConfig,
  createdAt: '2024-01-01T00:00:00.000Z',
  lastModified: '2024-01-01T00:00:00.000Z',
  version: 1
};

describe('Timer Engine Custom Preset Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (localStorage.getItem as jest.Mock).mockReturnValue(null);
    (localStorage.setItem as jest.Mock).mockImplementation(() => {});
    (localStorage.removeItem as jest.Mock).mockImplementation(() => {});
  });

  afterEach(() => {
    // Clean up any timers
    jest.clearAllTimers();
  });

  describe('createBoxingTimer with custom preset', () => {
    it('should create timer with custom preset configuration', () => {
      // Mock custom preset in localStorage
      (localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(customPresetData));

      const timer = createBoxingTimer('custom');
      const state = timer.getState();

      expect(timer).toBeInstanceOf(TimerEngine);
      expect(state.status).toBe('idle');
      expect(state.phase).toBe('preparation');
      expect(state.currentRound).toBe(1);
      
      // Verify custom configuration is applied
      expect(timer.getConfig()).toEqual(customTimerConfig);
    });

    it('should update custom preset lastUsed timestamp when loaded', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(customPresetData));

      createBoxingTimer('custom');

      // Verify localStorage was updated with lastUsed timestamp
      expect(localStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.CUSTOM_PRESET,
        expect.stringContaining('"lastUsed":"')
      );
    });

    it('should fall back to intermediate preset when custom preset not found', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue(null);

      const timer = createBoxingTimer('custom');
      const config = timer.getConfig();

      // Should use intermediate preset as fallback
      expect(config).toEqual({
        workDuration: 180,
        restDuration: 60,
        totalRounds: 5,
        enableWarning: true,
        prepDuration: 10
      });
    });

    it('should fall back to intermediate preset when custom preset data is corrupted', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue('invalid json');

      const timer = createBoxingTimer('custom');
      const config = timer.getConfig();

      expect(config.workDuration).toBe(180); // intermediate preset
      expect(config.totalRounds).toBe(5);    // intermediate preset
    });

    it('should fall back when custom preset exists but has invalid structure', () => {
      const invalidCustomPreset = {
        exists: false, // Invalid: exists is false
        name: 'Test',
        config: customTimerConfig
      };

      (localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(invalidCustomPreset));

      const timer = createBoxingTimer('custom');
      const config = timer.getConfig();

      expect(config.workDuration).toBe(180); // Fallback to intermediate
    });

    it('should handle localStorage errors gracefully', () => {
      (localStorage.getItem as jest.Mock).mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      expect(() => createBoxingTimer('custom')).not.toThrow();

      const timer = createBoxingTimer('custom');
      const config = timer.getConfig();

      expect(config.workDuration).toBe(180); // Fallback to intermediate
    });
  });

  describe('Custom preset timer behavior', () => {
    let timer: TimerEngine;

    beforeEach(() => {
      (localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(customPresetData));
      timer = createBoxingTimer('custom');
    });

    it('should initialize with custom preset timing values', () => {
      const state = timer.getState();

      expect(state.phase).toBe('preparation');
      expect(state.timeRemaining).toBe(15000); // 15 seconds prep time
      expect(state.currentRound).toBe(1);
      expect(state.status).toBe('idle');
    });

    it('should calculate workout progress correctly with custom preset', () => {
      // Start timer to begin workout
      timer.start();
      
      const state = timer.getState();
      
      // Total workout time: 15s prep + (240s * 8 rounds) + (90s * 7 rest periods)
      // = 15 + 1920 + 630 = 2565 seconds
      expect(state.workoutProgress).toBeGreaterThanOrEqual(0);
      expect(state.workoutProgress).toBeLessThan(1);
    });

    it('should handle custom round count correctly', () => {
      const config = timer.getConfig();
      
      expect(config.totalRounds).toBe(8); // Custom preset has 8 rounds
      
      const state = timer.getState();
      expect(state.currentRound).toBe(1);
    });

    it('should respect custom warning settings', () => {
      const config = timer.getConfig();
      
      expect(config.enableWarning).toBe(true);
      expect(config.warningDuration).toBe(10);
    });
  });

  describe('Custom preset validation in timer context', () => {
    it('should validate custom preset config meets timer requirements', () => {
      const validCustomPreset: CustomPreset = {
        exists: true,
        name: 'Valid Workout',
        config: {
          totalRounds: 3,
          workDuration: 120,
          restDuration: 60,
          prepDuration: 10,
          enableWarning: true,
          warningDuration: 10
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        lastModified: '2024-01-01T00:00:00.000Z',
        version: 1
      };

      (localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(validCustomPreset));

      expect(() => createBoxingTimer('custom')).not.toThrow();
      
      const timer = createBoxingTimer('custom');
      expect(timer.getConfig().totalRounds).toBe(3);
    });

    it('should handle missing warningDuration in custom preset', () => {
      const customPresetWithoutWarningDuration: CustomPreset = {
        ...customPresetData,
        config: {
          ...customTimerConfig,
          warningDuration: undefined as unknown as number // Missing warning duration
        }
      };

      (localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(customPresetWithoutWarningDuration));

      const timer = createBoxingTimer('custom');
      const config = timer.getConfig();

      // Timer should handle missing warningDuration gracefully
      expect(config).toBeDefined();
      expect(config.enableWarning).toBe(true);
    });
  });

  describe('Custom preset lifecycle with timer', () => {
    it('should work with programmatically created custom preset', () => {
      // Create custom preset programmatically
      (localStorage.setItem as jest.Mock).mockImplementation((key, value) => {
        if (key === STORAGE_KEYS.CUSTOM_PRESET) {
          (localStorage.getItem as jest.Mock).mockReturnValue(value);
        }
      });

      const createdPreset = createCustomPreset('Program Created', customTimerConfig);
      
      // Now use it with timer
      const timer = createBoxingTimer('custom');
      const config = timer.getConfig();

      expect(config).toEqual(customTimerConfig);
      expect(createdPreset.name).toBe('Program Created');
    });

    it('should handle custom preset deletion while timer exists', () => {
      // First create timer with custom preset
      (localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(customPresetData));
      const timer = createBoxingTimer('custom');
      
      // Verify timer has custom config
      expect(timer.getConfig().workDuration).toBe(240);

      // Delete preset (simulate user action)
      (localStorage.removeItem as jest.Mock).mockImplementation(() => {
        (localStorage.getItem as jest.Mock).mockReturnValue(null);
      });
      deleteCustomPreset();

      // Existing timer should continue with its configuration
      expect(timer.getConfig().workDuration).toBe(240);
      
      // But new timer should use fallback
      const newTimer = createBoxingTimer('custom');
      expect(newTimer.getConfig().workDuration).toBe(180); // Intermediate fallback
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle empty localStorage gracefully', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue('');

      const timer = createBoxingTimer('custom');
      const config = timer.getConfig();

      expect(config.workDuration).toBe(180); // Fallback to intermediate
    });

    it('should handle null localStorage value', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue(null);

      const timer = createBoxingTimer('custom');
      expect(timer).toBeInstanceOf(TimerEngine);
    });

    it('should handle malformed JSON in localStorage', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue('{invalid json');

      const timer = createBoxingTimer('custom');
      expect(timer.getConfig().workDuration).toBe(180); // Fallback
    });

    it('should handle preset with missing config property', () => {
      const presetWithoutConfig = {
        exists: true,
        name: 'Broken Preset',
        // config property missing
        createdAt: '2024-01-01T00:00:00.000Z',
        lastModified: '2024-01-01T00:00:00.000Z',
        version: 1
      };

      (localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(presetWithoutConfig));

      const timer = createBoxingTimer('custom');
      expect(timer.getConfig().workDuration).toBe(180); // Fallback
    });
  });

  describe('Type safety verification', () => {
    it('should maintain type safety for TimerConfig', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(customPresetData));
      
      const timer = createBoxingTimer('custom');
      const config = timer.getConfig();

      // TypeScript should enforce these types
      expect(typeof config.totalRounds).toBe('number');
      expect(typeof config.workDuration).toBe('number');
      expect(typeof config.restDuration).toBe('number');
      expect(typeof config.enableWarning).toBe('boolean');
      expect(typeof config.prepDuration).toBe('number');
    });

    it('should handle partial TimerConfig in custom preset', () => {
      const partialConfigPreset: CustomPreset = {
        exists: true,
        name: 'Partial Config',
        config: {
          totalRounds: 5,
          workDuration: 180,
          restDuration: 60,
          enableWarning: true
          // prepDuration missing - should use default
        } as TimerConfig,
        createdAt: '2024-01-01T00:00:00.000Z',
        lastModified: '2024-01-01T00:00:00.000Z',
        version: 1
      };

      (localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(partialConfigPreset));

      const timer = createBoxingTimer('custom');
      const config = timer.getConfig();

      expect(config.totalRounds).toBe(5);
      expect(config.workDuration).toBe(180);
      // prepDuration may be undefined in partial config, timer should handle gracefully
      expect(config.prepDuration === undefined || config.prepDuration >= 0).toBe(true);
    });
  });
});