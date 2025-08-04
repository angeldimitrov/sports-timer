/**
 * Tests for useDebounceAutosave hook - Basic debouncing functionality
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useDebounceAutosave } from '../use-debounced-autosave';

jest.useFakeTimers();

describe('useDebounceAutosave - Basic functionality', () => {
  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test('should execute save function after debounce delay', async () => {
    const mockSave = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useDebounceAutosave(mockSave, { delay: 500 }));

    act(() => {
      result.current.triggerSave();
    });

    expect(mockSave).not.toHaveBeenCalled();
    expect(result.current.saveStatus).toBe('idle');

    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(result.current.saveStatus).toBe('saved');
    });
  });

  test('should debounce multiple rapid save calls', async () => {
    const mockSave = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useDebounceAutosave(mockSave, { delay: 500 }));

    // Trigger multiple saves rapidly
    act(() => {
      result.current.triggerSave();
      result.current.triggerSave();
      result.current.triggerSave();
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledTimes(1);
    });
  });

  test('should handle save errors gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    const mockSave = jest.fn().mockRejectedValue(new Error('Save failed'));
    const { result } = renderHook(() => useDebounceAutosave(mockSave));

    act(() => {
      result.current.triggerSave();
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(result.current.saveStatus).toBe('error');
      expect(consoleError).toHaveBeenCalled();
    });

    consoleError.mockRestore();
  });
});