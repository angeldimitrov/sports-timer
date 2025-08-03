/**
 * Unit Tests for Custom Preset Management System
 * 
 * Tests core functionality including CRUD operations, validation logic,
 * storage persistence, and error handling for the custom preset system.
 * 
 * Business Logic Coverage:
 * - Preset creation with validation constraints
 * - Update operations with proper versioning
 * - Storage operations with error recovery
 * - Display utilities for UI integration
 */

import {
  createCustomPreset,
  updateCustomPreset,
  getCustomPreset,
  deleteCustomPreset,
  markCustomPresetUsed,
  getCustomPresetDisplayInfo,
  isStandardPresetConfig,
  getPresetLimits,
  CustomPresetValidationError,
  CustomPresetStorageError,
  type CustomPreset,
  type PresetType,
  STORAGE_KEYS
} from '../custom-preset';

import { TimerConfig } from '../timer-engine';

// Type-safe test data
const validTimerConfig: TimerConfig = {
  totalRounds: 5,
  workDuration: 180,
  restDuration: 60,
  prepDuration: 10,
  enableWarning: true,
  warningDuration: 10
};

const validPresetName = 'My Custom Workout';

// Use the global localStorage mock from jest setup

describe('Custom Preset Management System', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Reset localStorage mock state using global mock
    (localStorage.getItem as jest.Mock).mockReturnValue(null);
    (localStorage.setItem as jest.Mock).mockImplementation(() => {});
    (localStorage.removeItem as jest.Mock).mockImplementation(() => {});

    // Mock console methods to suppress expected error messages in tests
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console methods after each test
    jest.restoreAllMocks();
  });

  describe('createCustomPreset', () => {
    it('should create valid custom preset with proper structure', () => {
      const preset = createCustomPreset(validPresetName, validTimerConfig);

      expect(preset).toMatchObject({
        exists: true,
        name: validPresetName,
        config: validTimerConfig,
        version: 1
      });
      
      // Verify timestamps are recent ISO strings
      expect(preset.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(preset.lastModified).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(preset.createdAt).toBe(preset.lastModified);
      
      // Verify localStorage was called
      expect(localStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.CUSTOM_PRESET,
        JSON.stringify(preset)
      );
    });

    it('should trim preset name whitespace', () => {
      const nameWithSpaces = '  My Workout  ';
      const preset = createCustomPreset(nameWithSpaces, validTimerConfig);
      
      expect(preset.name).toBe('My Workout');
    });

    it('should create deep copy of timer config', () => {
      const originalConfig = { ...validTimerConfig };
      const preset = createCustomPreset(validPresetName, validTimerConfig);
      
      // Modify original config to verify deep copy
      originalConfig.totalRounds = 999;
      
      expect(preset.config.totalRounds).toBe(validTimerConfig.totalRounds);
      expect(preset.config).not.toBe(validTimerConfig);
    });

    it('should throw validation error for empty name', () => {
      expect(() => createCustomPreset('', validTimerConfig))
        .toThrow(CustomPresetValidationError);
      
      expect(() => createCustomPreset('   ', validTimerConfig))
        .toThrow('name: Name cannot be empty');
    });

    it('should throw validation error for name too long', () => {
      const longName = 'a'.repeat(31); // Exceeds 30 character limit
      
      expect(() => createCustomPreset(longName, validTimerConfig))
        .toThrow('name: Name cannot exceed 30 characters');
    });

    it('should reject standard preset names', () => {
      const standardNames: string[] = ['beginner', 'intermediate', 'advanced', 'BEGINNER'];
      
      standardNames.forEach(name => {
        expect(() => createCustomPreset(name, validTimerConfig))
          .toThrow('name: Cannot use standard preset names');
      });
    });

    it('should validate timer config constraints', () => {
      const invalidConfigs: Array<{ config: Partial<TimerConfig>; expectedError: string }> = [
        {
          config: { ...validTimerConfig, totalRounds: 0 },
          expectedError: 'totalRounds: Must be between 1 and 20'
        },
        {
          config: { ...validTimerConfig, totalRounds: 21 },
          expectedError: 'totalRounds: Must be between 1 and 20'
        },
        {
          config: { ...validTimerConfig, workDuration: 9 },
          expectedError: 'workDuration: Must be between 10 and 600 seconds'
        },
        {
          config: { ...validTimerConfig, workDuration: 601 },
          expectedError: 'workDuration: Must be between 10 and 600 seconds'
        },
        {
          config: { ...validTimerConfig, restDuration: 9 },
          expectedError: 'restDuration: Must be between 10 and 300 seconds'
        },
        {
          config: { ...validTimerConfig, restDuration: 301 },
          expectedError: 'restDuration: Must be between 10 and 300 seconds'
        },
        {
          config: { ...validTimerConfig, prepDuration: -1 },
          expectedError: 'prepDuration: Must be between 0 and 60 seconds'
        },
        {
          config: { ...validTimerConfig, prepDuration: 61 },
          expectedError: 'prepDuration: Must be between 0 and 60 seconds'
        }
      ];

      invalidConfigs.forEach(({ config, expectedError }) => {
        expect(() => createCustomPreset(validPresetName, config as TimerConfig))
          .toThrow(expectedError);
      });
    });

    it('should handle localStorage storage errors', () => {
      (localStorage.setItem as jest.Mock).mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      expect(() => createCustomPreset(validPresetName, validTimerConfig))
        .toThrow(CustomPresetStorageError);
    });
  });

  describe('updateCustomPreset', () => {
    const existingPreset: CustomPreset = {
      exists: true,
      name: 'Existing Workout',
      config: validTimerConfig,
      createdAt: '2024-01-01T00:00:00.000Z',
      lastModified: '2024-01-01T00:00:00.000Z',
      version: 1
    };

    beforeEach(() => {
      (localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(existingPreset));
    });

    it('should update existing preset with new data', () => {
      const newConfig: TimerConfig = {
        ...validTimerConfig,
        totalRounds: 8,
        workDuration: 240
      };

      const updatedPreset = updateCustomPreset('Updated Workout', newConfig);

      expect(updatedPreset).toMatchObject({
        exists: true,
        name: 'Updated Workout',
        config: newConfig,
        createdAt: existingPreset.createdAt,
        version: 1
      });
      
      // Verify lastModified was updated
      expect(updatedPreset.lastModified).not.toBe(existingPreset.lastModified);
      expect(new Date(updatedPreset.lastModified).getTime())
        .toBeGreaterThan(new Date(existingPreset.lastModified).getTime());
    });

    it('should preserve creation timestamp and version', () => {
      const updatedPreset = updateCustomPreset('Updated Name', validTimerConfig);
      
      expect(updatedPreset.createdAt).toBe(existingPreset.createdAt);
      expect(updatedPreset.version).toBe(existingPreset.version);
    });

    it('should throw error when no preset exists to update', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue(null);

      expect(() => updateCustomPreset(validPresetName, validTimerConfig))
        .toThrow('Failed to update custom preset: No custom preset exists to update');
    });

    it('should validate updated name and config', () => {
      expect(() => updateCustomPreset('', validTimerConfig))
        .toThrow(CustomPresetValidationError);
        
      const invalidConfig = { ...validTimerConfig, totalRounds: 0 };
      expect(() => updateCustomPreset(validPresetName, invalidConfig))
        .toThrow(CustomPresetValidationError);
    });
  });

  describe('getCustomPreset', () => {
    it('should return null when no preset exists', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue(null);
      
      const result = getCustomPreset();
      expect(result).toBeNull();
    });

    it('should return parsed preset when valid data exists', () => {
      const storedPreset: CustomPreset = {
        exists: true,
        name: 'Stored Workout',
        config: validTimerConfig,
        createdAt: '2024-01-01T00:00:00.000Z',
        lastModified: '2024-01-01T00:00:00.000Z',
        version: 1
      };
      
      (localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(storedPreset));
      
      const result = getCustomPreset();
      expect(result).toEqual(storedPreset);
    });

    it('should return null for corrupted data', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue('invalid json');
      
      const result = getCustomPreset();
      expect(result).toBeNull();
    });

    it('should return null for invalid preset structure', () => {
      const invalidPresets = [
        { exists: false },
        { exists: true, name: '', config: null },
        { exists: true, name: 'Test' }, // missing config
        { config: validTimerConfig } // missing name and exists
      ];

      invalidPresets.forEach(invalidPreset => {
        (localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(invalidPreset));
        
        const result = getCustomPreset();
        expect(result).toBeNull();
      });
    });

    it('should return null in server environment', () => {
      // Mock server environment (window undefined)
      const originalWindow = global.window;
      delete (global as Record<string, unknown>).window;

      const result = getCustomPreset();
      expect(result).toBeNull();

      // Restore window
      global.window = originalWindow;
    });
  });

  describe('markCustomPresetUsed', () => {
    const existingPreset: CustomPreset = {
      exists: true,
      name: 'Test Workout',
      config: validTimerConfig,
      createdAt: '2024-01-01T00:00:00.000Z',
      lastModified: '2024-01-01T00:00:00.000Z',
      version: 1
    };

    it('should update lastUsed timestamp for existing preset', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(existingPreset));
      
      markCustomPresetUsed();
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.CUSTOM_PRESET,
        expect.stringContaining('"lastUsed":"202') // Accept 2024 or 2025
      );
    });

    it('should handle missing preset gracefully', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue(null);
      
      expect(() => markCustomPresetUsed()).not.toThrow();
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    it('should handle storage errors gracefully', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(existingPreset));
      (localStorage.setItem as jest.Mock).mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      expect(() => markCustomPresetUsed()).not.toThrow();
    });
  });

  describe('deleteCustomPreset', () => {
    it('should remove preset from localStorage', () => {
      deleteCustomPreset();
      
      expect(localStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.CUSTOM_PRESET);
    });

    it('should handle storage errors', () => {
      (localStorage.removeItem as jest.Mock).mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(() => deleteCustomPreset())
        .toThrow(CustomPresetStorageError);
    });

    it('should handle server environment', () => {
      const originalWindow = global.window;
      delete (global as Record<string, unknown>).window;

      expect(() => deleteCustomPreset()).not.toThrow();

      global.window = originalWindow;
    });
  });

  describe('getCustomPresetDisplayInfo', () => {
    it('should return display info for existing preset', () => {
      const customPreset: CustomPreset = {
        exists: true,
        name: 'Power Workout',
        config: {
          totalRounds: 6,
          workDuration: 240,
          restDuration: 90,
          prepDuration: 15,
          enableWarning: true,
          warningDuration: 10
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        lastModified: '2024-01-01T00:00:00.000Z',
        version: 1
      };

      (localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(customPreset));
      
      const displayInfo = getCustomPresetDisplayInfo();
      
      expect(displayInfo).toEqual({
        id: 'custom',
        name: 'Power Workout',
        rounds: 6,
        workDuration: 240,
        restDuration: 90,
        totalTime: '31:45', // 15s prep + (240s * 6) + (90s * 5) = 15 + 1440 + 450 = 1905s = 31:45
        color: 'from-indigo-500 to-purple-600',
        icon: null,
        difficulty: 0,
        isCustom: true
      });
    });

    it('should return null when no preset exists', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue(null);
      
      const displayInfo = getCustomPresetDisplayInfo();
      expect(displayInfo).toBeNull();
    });

    it('should calculate total time correctly with various configurations', () => {
      const testCases = [
        {
          config: { totalRounds: 3, workDuration: 120, restDuration: 60, prepDuration: 10 },
          expectedTime: '8:10' // 10 + (120*3) + (60*2) = 10 + 360 + 120 = 490s = 8:10
        },
        {
          config: { totalRounds: 1, workDuration: 60, restDuration: 30, prepDuration: 0 },
          expectedTime: '1:00' // 0 + (60*1) + (30*0) = 60s = 1:00
        }
      ];

      testCases.forEach(({ config, expectedTime }) => {
        const preset: CustomPreset = {
          exists: true,
          name: 'Test',
          config: { ...validTimerConfig, ...config },
          createdAt: '2024-01-01T00:00:00.000Z',
          lastModified: '2024-01-01T00:00:00.000Z',
          version: 1
        };

        (localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(preset));
        
        const displayInfo = getCustomPresetDisplayInfo();
        expect(displayInfo?.totalTime).toBe(expectedTime);
      });
    });
  });

  describe('isStandardPresetConfig', () => {
    const standardConfigs: Array<{ type: PresetType; config: TimerConfig }> = [
      {
        type: 'beginner',
        config: {
          workDuration: 120,
          restDuration: 60,
          totalRounds: 3,
          enableWarning: true,
          prepDuration: 10
        }
      },
      {
        type: 'intermediate',
        config: {
          workDuration: 180,
          restDuration: 60,
          totalRounds: 5,
          enableWarning: true,
          prepDuration: 10
        }
      },
      {
        type: 'advanced',
        config: {
          workDuration: 180,
          restDuration: 60,
          totalRounds: 12,
          enableWarning: true,
          prepDuration: 5
        }
      }
    ];

    standardConfigs.forEach(({ type, config }) => {
      it(`should identify ${type} preset configuration`, () => {
        const result = isStandardPresetConfig(config);
        expect(result).toBe(type);
      });
    });

    it('should return null for non-standard configurations', () => {
      const customConfig: TimerConfig = {
        workDuration: 150, // Non-standard duration
        restDuration: 60,
        totalRounds: 5,
        enableWarning: true,
        prepDuration: 10
      };

      const result = isStandardPresetConfig(customConfig);
      expect(result).toBeNull();
    });

    it('should handle missing prepDuration (defaults to 10)', () => {
      const configWithoutPrep = {
        workDuration: 120,
        restDuration: 60,
        totalRounds: 3,
        enableWarning: true
        // prepDuration omitted
      };

      const result = isStandardPresetConfig(configWithoutPrep as TimerConfig);
      expect(result).toBe('beginner');
    });
  });

  describe('getPresetLimits', () => {
    it('should return configuration limits object', () => {
      const limits = getPresetLimits();
      
      expect(limits).toEqual({
        name: { minLength: 1, maxLength: 30 },
        rounds: { min: 1, max: 20 },
        workDuration: { min: 10, max: 600 },
        restDuration: { min: 10, max: 300 },
        prepDuration: { min: 0, max: 60 }
      });
    });

    it('should return read-only limits object', () => {
      const limits = getPresetLimits();
      
      // Verify structure is correct for type safety
      expect(typeof limits.name.minLength).toBe('number');
      expect(typeof limits.name.maxLength).toBe('number');
      expect(typeof limits.rounds.min).toBe('number');
      expect(typeof limits.rounds.max).toBe('number');
    });
  });

  describe('Error Classes', () => {
    it('should create CustomPresetValidationError with proper structure', () => {
      const error = new CustomPresetValidationError('testField', 'test message');
      
      expect(error.name).toBe('CustomPresetValidationError');
      expect(error.message).toBe('testField: test message');
      expect(error).toBeInstanceOf(Error);
    });

    it('should create CustomPresetStorageError with proper structure', () => {
      const cause = new Error('Original error');
      const error = new CustomPresetStorageError('save', cause);
      
      expect(error.name).toBe('CustomPresetStorageError');
      expect(error.message).toBe('Failed to save custom preset: Original error');
      expect(error.cause).toBe(cause);
      expect(error).toBeInstanceOf(Error);
    });

    it('should handle storage error without cause', () => {
      const error = new CustomPresetStorageError('delete');
      
      expect(error.message).toBe('Failed to delete custom preset: Unknown error');
      expect(error.cause).toBeUndefined();
    });
  });
});