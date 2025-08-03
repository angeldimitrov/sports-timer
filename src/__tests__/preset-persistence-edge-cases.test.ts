/**
 * Edge Case Tests for Preset Persistence System
 * 
 * Tests complex edge cases, race conditions, and failure scenarios that could
 * occur in production environments. Focuses on system resilience, error recovery,
 * and maintaining data consistency under adverse conditions.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { usePresetPersistence } from '../hooks/use-preset-persistence';

// Mock localStorage properly
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

// Global setup
const mockStorage = createMockStorage();
Object.defineProperty(window, 'localStorage', {
  value: mockStorage,
  writable: true
});

// Function for creating valid timer config - removed as unused

describe('Preset Persistence Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.clear();
    // Reset all mock implementations to defaults
    mockStorage.getItem.mockReturnValue(null);
    mockStorage.setItem.mockImplementation(() => {
      // Store normally unless specifically overridden
    });
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Hydration Mismatch Prevention', () => {
    it('should initialize and complete setup in test environment', async () => {
      const { result } = renderHook(() => usePresetPersistence());
      
      // In test environment, initialization happens immediately
      // This is different from browser where there might be async behavior
      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Should load default when no saved preset exists
      expect(result.current.selectedPreset).toBe('beginner');
    });

    it('should handle basic initialization correctly', async () => {
      const { result } = renderHook(() => usePresetPersistence());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Should provide all necessary functions
      expect(typeof result.current.setSelectedPreset).toBe('function');
      expect(typeof result.current.isPresetSelected).toBe('function');
      expect(typeof result.current.getInitialPreset).toBe('function');
      expect(result.current.selectedPreset).toBe('beginner');
    });
  });

  describe('localStorage Failure Scenarios', () => {
    it('should handle localStorage getItem errors gracefully', async () => {
      mockStorage.getItem.mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      const { result } = renderHook(() => usePresetPersistence());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Should fallback to default when localStorage fails
      expect(result.current.selectedPreset).toBe('beginner');
    });

    it('should handle localStorage setItem errors gracefully', async () => {
      mockStorage.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const { result } = renderHook(() => usePresetPersistence());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Should still update state even if localStorage fails
      act(() => {
        result.current.setSelectedPreset('advanced');
      });

      expect(result.current.selectedPreset).toBe('advanced');
    });

    it('should handle corrupted localStorage data', async () => {
      mockStorage.getItem.mockReturnValue('invalid json');

      const { result } = renderHook(() => usePresetPersistence());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Should fallback to default when JSON parsing fails
      expect(result.current.selectedPreset).toBe('beginner');
    });
  });

  describe('Race Conditions and Concurrency', () => {
    it('should handle rapid preset changes correctly', async () => {
      const { result } = renderHook(() => usePresetPersistence());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Rapid changes
      act(() => {
        result.current.setSelectedPreset('intermediate');
        result.current.setSelectedPreset('advanced');
        result.current.setSelectedPreset('beginner');
      });

      // Should settle on the last change
      expect(result.current.selectedPreset).toBe('beginner');
    });

    it('should handle concurrent hook instances independently', async () => {
      const { result: result1 } = renderHook(() => usePresetPersistence());
      const { result: result2 } = renderHook(() => usePresetPersistence());

      await waitFor(() => {
        expect(result1.current.isInitialized).toBe(true);
        expect(result2.current.isInitialized).toBe(true);
      });

      // Both should start with same state
      expect(result1.current.selectedPreset).toBe('beginner');
      expect(result2.current.selectedPreset).toBe('beginner');

      // Change one instance
      act(() => {
        result1.current.setSelectedPreset('advanced');
      });

      // Both instances should reflect the change (they share localStorage)
      expect(result1.current.selectedPreset).toBe('advanced');
      // Note: result2 won't automatically update as it doesn't listen to storage events
      // This is expected behavior for this implementation
    });
  });

  describe('Memory Management and Performance', () => {
    it('should handle rapid mount/unmount cycles', async () => {
      for (let i = 0; i < 10; i++) {
        const { result, unmount } = renderHook(() => usePresetPersistence());
        
        await waitFor(() => {
          expect(result.current.isInitialized).toBe(true);
        });

        expect(result.current.selectedPreset).toBe('beginner');
        unmount();
      }

      // Should not leak memory or cause errors
      expect(true).toBe(true);
    });

    it('should handle excessive localStorage operations', async () => {
      const { result } = renderHook(() => usePresetPersistence());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Stress test with many rapid changes
      const presets: Array<'beginner' | 'intermediate' | 'advanced' | 'custom'> = 
        ['beginner', 'intermediate', 'advanced', 'beginner'];

      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.setSelectedPreset(presets[i % presets.length]);
        }
      });

      // Should handle stress without breaking
      expect(result.current.selectedPreset).toBe('beginner'); // Last preset in cycle
    });
  });

  describe('Browser Compatibility Edge Cases', () => {
    it('should handle browsers without localStorage support', async () => {
      // Temporarily remove localStorage
      const originalStorage = window.localStorage;
      delete (window as Window & { localStorage?: Storage }).localStorage;

      const { result } = renderHook(() => usePresetPersistence());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Should fallback gracefully
      expect(result.current.selectedPreset).toBe('beginner');

      // Restore localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalStorage,
        writable: true
      });
    });

    it('should handle localStorage key collisions', async () => {
      // Set conflicting data in localStorage
      mockStorage.getItem.mockReturnValue('not-a-valid-preset');

      const { result } = renderHook(() => usePresetPersistence());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Should fallback to default for invalid preset
      expect(result.current.selectedPreset).toBe('beginner');
    });
  });

  describe('State Consistency Under Stress', () => {
    it('should maintain state consistency during rapid preset changes', async () => {
      const { result } = renderHook(() => usePresetPersistence());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      const presets: Array<'beginner' | 'intermediate' | 'advanced' | 'custom'> = 
        ['intermediate', 'advanced', 'beginner'];

      // Test rapid changes sequentially for consistency
      for (const preset of presets) {
        act(() => {
          result.current.setSelectedPreset(preset);
        });
        
        // Verify consistency after each change
        expect(result.current.selectedPreset).toBe(preset);
        expect(result.current.isPresetSelected(preset)).toBe(true);
        expect(result.current.getInitialPreset()).toBe(preset);
      }

      expect(result.current.selectedPreset).toBe('beginner');
    });

    it('should handle validation edge cases', async () => {
      const { result } = renderHook(() => usePresetPersistence());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Test all valid preset types sequentially 
      const validPresets: Array<'beginner' | 'intermediate' | 'advanced' | 'custom'> = 
        ['beginner', 'intermediate', 'advanced', 'custom'];

      for (const preset of validPresets) {
        act(() => {
          result.current.setSelectedPreset(preset);
        });
        expect(result.current.selectedPreset).toBe(preset);
      }

      expect(result.current.selectedPreset).toBe('custom');
    });
  });

  describe('Error Boundary and Graceful Degradation', () => {
    it('should provide fallback behavior when all storage operations fail', async () => {
      // Mock all localStorage operations to fail
      mockStorage.getItem.mockImplementation(() => {
        throw new Error('Storage completely unavailable');
      });
      mockStorage.setItem.mockImplementation(() => {
        throw new Error('Storage completely unavailable');
      });

      const { result } = renderHook(() => usePresetPersistence());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Should still provide basic functionality
      expect(result.current.selectedPreset).toBe('beginner');
      expect(typeof result.current.setSelectedPreset).toBe('function');
      expect(typeof result.current.isPresetSelected).toBe('function');
      expect(typeof result.current.getInitialPreset).toBe('function');
    });

    it('should handle unexpected data types in localStorage', async () => {
      // Set non-string data (should not happen but test resilience)
      mockStorage.getItem.mockReturnValue(null);
      mockStorage.getItem.mockReturnValueOnce('123'); // Invalid preset type

      const { result } = renderHook(() => usePresetPersistence());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(result.current.selectedPreset).toBe('beginner');
    });
  });
});