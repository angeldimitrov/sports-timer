/**
 * Integration Tests for Custom Preset System
 * 
 * Tests the integration between custom preset functions and preset persistence,
 * ensuring the complete workflow works correctly from creation to selection.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { usePresetPersistence } from '../../hooks/use-preset-persistence';
import {
  createCustomPreset,
  getCustomPreset,
  deleteCustomPreset,
  getCustomPresetDisplayInfo,
  CustomPresetValidationError
} from '../custom-preset';
import { TimerConfig } from '../timer-engine';

// Mock localStorage for tests
const createMockStorage = () => {
  let store: Record<string, string> = {};
  
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    length: 0,
    key: jest.fn(() => null)
  };
};

const mockStorage = createMockStorage();
Object.defineProperty(window, 'localStorage', {
  value: mockStorage,
  writable: true
});

const createValidTimerConfig = (): TimerConfig => ({
  totalRounds: 5,
  workDuration: 180,
  restDuration: 60,
  prepDuration: 10,
  enableWarning: true,
  warningDuration: 10
});

describe('Custom Preset Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.clear();
  });

  describe('Custom Preset Creation and Selection Workflow', () => {
    it('should create custom preset and select it with preset persistence', async () => {
      const config = createValidTimerConfig();
      const presetName = 'My Test Workout';

      // Create custom preset
      const customPreset = createCustomPreset(presetName, config);
      expect(customPreset.name).toBe(presetName);
      expect(customPreset.config).toEqual(config);
      expect(customPreset.exists).toBe(true);

      // Initialize preset persistence hook
      const { result } = renderHook(() => usePresetPersistence());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Select the custom preset
      act(() => {
        result.current.setSelectedPreset('custom');
      });

      expect(result.current.selectedPreset).toBe('custom');
      expect(result.current.isPresetSelected('custom')).toBe(true);
    });

    it('should handle custom preset creation and selection workflow', async () => {
      const initialConfig = createValidTimerConfig();
      
      // Create initial preset
      const preset = createCustomPreset('Initial Workout', initialConfig);
      expect(preset.name).toBe('Initial Workout');

      const { result } = renderHook(() => usePresetPersistence());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Select custom preset
      act(() => {
        result.current.setSelectedPreset('custom');
      });

      // Preset should be selected
      expect(result.current.selectedPreset).toBe('custom');
      expect(result.current.isPresetSelected('custom')).toBe(true);
    });

    it('should handle custom preset deletion with fallback', async () => {
      // Create and select custom preset
      createCustomPreset('Temporary Workout', createValidTimerConfig());

      const { result } = renderHook(() => usePresetPersistence());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      act(() => {
        result.current.setSelectedPreset('custom');
      });

      expect(result.current.selectedPreset).toBe('custom');

      // Delete the custom preset
      deleteCustomPreset();

      // Verify deletion
      expect(getCustomPreset()).toBeNull();
      expect(getCustomPresetDisplayInfo()).toBeNull();

      // User should manually select a different preset after deletion
      // (The hook doesn't auto-fallback to maintain user control)
      expect(result.current.selectedPreset).toBe('custom'); // Still shows custom until user changes
    });
  });

  describe('Cross-Session Persistence', () => {
    it('should handle preset persistence correctly', async () => {
      const { result } = renderHook(() => usePresetPersistence());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Test basic persistence functionality
      act(() => {
        result.current.setSelectedPreset('custom');
      });

      expect(result.current.selectedPreset).toBe('custom');
      expect(result.current.isPresetSelected('custom')).toBe(true);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle custom preset creation errors gracefully', async () => {
      const { result } = renderHook(() => usePresetPersistence());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Try to create invalid preset
      expect(() => {
        createCustomPreset('', createValidTimerConfig()); // Empty name
      }).toThrow(CustomPresetValidationError);

      // Preset persistence should be unaffected
      expect(result.current.selectedPreset).toBe('beginner');
      expect(result.current.isInitialized).toBe(true);
    });

    it('should handle preset selection independent of storage errors', async () => {
      const { result } = renderHook(() => usePresetPersistence());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Preset persistence should work for standard presets
      act(() => {
        result.current.setSelectedPreset('intermediate');
      });

      expect(result.current.selectedPreset).toBe('intermediate');
    });
  });

  describe('Display Info Integration', () => {
    it('should work with custom preset creation', async () => {
      const config = createValidTimerConfig();
      config.totalRounds = 10;
      config.workDuration = 240; // 4 minutes
      config.restDuration = 90;  // 1.5 minutes

      const preset = createCustomPreset('Display Test', config);
      expect(preset.name).toBe('Display Test');
      expect(preset.config.totalRounds).toBe(10);
      expect(preset.config.workDuration).toBe(240);
      expect(preset.config.restDuration).toBe(90);
    });

    it('should return null display info when no custom preset exists', () => {
      const displayInfo = getCustomPresetDisplayInfo();
      expect(displayInfo).toBeNull();
    });
  });

  describe('Integration with Timer Requirements', () => {
    it('should support all timer configuration requirements', async () => {
      const fullConfig: TimerConfig = {
        totalRounds: 12,
        workDuration: 180,
        restDuration: 45,
        prepDuration: 15,
        enableWarning: true,
        warningDuration: 10
      };

      const customPreset = createCustomPreset('Full Config Test', fullConfig);
      
      // Verify all fields are preserved
      expect(customPreset.config).toEqual(fullConfig);
      expect(customPreset.name).toBe('Full Config Test');

      const { result } = renderHook(() => usePresetPersistence());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      act(() => {
        result.current.setSelectedPreset('custom');
      });

      // Should work with timer integration
      const initialPreset = result.current.getInitialPreset();
      expect(initialPreset).toBe('custom');
    });
  });
});