import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMutation } from './useMutation';

describe('Generic Hook: useMutation', () => {
  it('should handle successful mutation and update state', async () => {
    const mutationFn = vi.fn().mockResolvedValue({ id: 'res-1', status: 'OK' });
    const onSuccess = vi.fn();

    const { result } = renderHook(() =>
      useMutation<{ id: string; status: string }, { rating: number }>({
        mutationFn,
        onSuccess,
      }),
    );

    expect(result.current.isPending).toBe(false);
    expect(result.current.result).toBeNull();

    let mutatePromise: Promise<any>;
    act(() => {
      mutatePromise = result.current.mutate({ rating: 5 });
    });

    expect(result.current.isPending).toBe(true);

    await act(async () => {
      await mutatePromise;
    });

    expect(result.current.isPending).toBe(false);
    expect(result.current.result).toEqual({ id: 'res-1', status: 'OK' });
    expect(onSuccess).toHaveBeenCalledWith({ id: 'res-1', status: 'OK' }, { rating: 5 });
  });

  // Scenario 22: Duplicate submit protection while pending
  it('Scenario 22: should guard against duplicate execution while mutation is pending', async () => {
    let resolveMutation: (val: any) => void;
    const promise = new Promise((resolve) => {
      resolveMutation = resolve;
    });
    const mutationFn = vi.fn().mockReturnValue(promise);

    const { result } = renderHook(() =>
      useMutation<{ ok: boolean }, { payload: string }>({
        mutationFn,
      }),
    );

    // First call
    act(() => {
      result.current.mutate({ payload: 'first' });
    });

    expect(result.current.isPending).toBe(true);

    // Second accidental duplicate call while still pending
    let secondResult: any;
    act(() => {
      result.current.mutate({ payload: 'second' }).then((res) => {
        secondResult = res;
      });
    });

    // Second call should return undefined without invoking mutationFn again
    expect(mutationFn).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveMutation({ ok: true });
    });

    expect(result.current.isPending).toBe(false);
    expect(secondResult).toBeUndefined();
  });

  it('should catch error and update error state', async () => {
    const mutationFn = vi.fn().mockRejectedValue(new Error('Lỗi máy chủ'));
    const onError = vi.fn();

    const { result } = renderHook(() =>
      useMutation<string, void>({
        mutationFn,
        onError,
      }),
    );

    await act(async () => {
      try {
        await result.current.mutate();
      } catch {
        // expected
      }
    });

    expect(result.current.isPending).toBe(false);
    expect(result.current.error).toBe('Lỗi máy chủ');
    expect(onError).toHaveBeenCalled();
  });
});
