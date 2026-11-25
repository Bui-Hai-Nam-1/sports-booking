import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePaginatedQuery } from './usePaginatedQuery';

describe('Generic Hook: usePaginatedQuery', () => {
  it('should fetch initial data on mount with initial filters and page', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      items: [{ id: '1', name: 'Court A' }],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });

    const { result } = renderHook(() =>
      usePaginatedQuery<{ id: string; name: string }, { status?: string }>({
        fetcher,
        initialFilters: { status: 'PENDING' },
      }),
    );

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.items).toEqual([{ id: '1', name: 'Court A' }]);
    expect(result.current.total).toBe(1);
    expect(fetcher).toHaveBeenCalledWith({
      status: 'PENDING',
      page: 1,
      pageSize: 10,
    });
  });

  // Scenario 21: Stale response cancellation guard
  it('Scenario 21: should ignore slower stale response if a newer query has been triggered', async () => {
    let resolveFirst: (val: any) => void;
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });

    const secondPromise = Promise.resolve({
      items: [{ id: '2', name: 'Court B - New Query' }],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });

    const fetcher = vi
      .fn()
      .mockImplementationOnce(() => firstPromise)
      .mockImplementationOnce(() => secondPromise);

    const { result } = renderHook(() =>
      usePaginatedQuery<{ id: string; name: string }, { search: string }>({
        fetcher,
        initialFilters: { search: 'initial' },
      }),
    );

    // Trigger second search filter change immediately
    act(() => {
      result.current.setFilters({ search: 'updated' });
    });

    // Wait for the second fast query to complete
    await waitFor(() => {
      expect(result.current.items).toEqual([{ id: '2', name: 'Court B - New Query' }]);
    });

    // Now resolve the older, slower request with old data
    act(() => {
      resolveFirst({
        items: [{ id: '1', name: 'Court A - Old Data' }],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });
    });

    // Verify items did NOT get overwritten by the older response!
    expect(result.current.items).toEqual([{ id: '2', name: 'Court B - New Query' }]);
  });

  it('should reset page to 1 when filters are changed', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0,
    });

    const { result } = renderHook(() =>
      usePaginatedQuery<{ id: string }, { status?: string }>({
        fetcher,
        initialFilters: {},
      }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setPage(3);
    });
    expect(result.current.page).toBe(3);

    await act(async () => {
      result.current.setFilters({ status: 'CONFIRMED' });
    });

    await waitFor(() => {
      expect(result.current.page).toBe(1);
    });
  });
});
