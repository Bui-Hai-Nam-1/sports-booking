import { useCallback, useEffect, useRef, useState } from 'react';
import type { PaginatedResponse } from '../types';

export interface UsePaginatedQueryOptions<TItem, TFilters> {
  fetcher: (params: TFilters & { page: number; pageSize: number }) => Promise<PaginatedResponse<TItem>>;
  initialFilters: TFilters;
  initialPage?: number;
  initialPageSize?: number;
}

export interface UsePaginatedQueryResult<TItem, TFilters> {
  items: TItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  filters: TFilters;
  setFilters: (filtersOrFn: TFilters | ((prev: TFilters) => TFilters)) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  refetch: () => void;
}

export function usePaginatedQuery<TItem, TFilters extends object>({
  fetcher,
  initialFilters,
  initialPage = 1,
  initialPageSize = 10,
}: UsePaginatedQueryOptions<TItem, TFilters>): UsePaginatedQueryResult<TItem, TFilters> {
  const [items, setItems] = useState<TItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPageState] = useState<number>(initialPage);
  const [pageSize, setPageSizeState] = useState<number>(initialPageSize);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<TFilters>(initialFilters);

  // Request cancellation / stale response guard
  const latestRequestId = useRef<number>(0);
  const filtersRef = useRef<TFilters>(filters);
  filtersRef.current = filters;

  const fetchData = useCallback(
    async (currentPage: number, currentPageSize: number, currentFilters: TFilters) => {
      const requestId = ++latestRequestId.current;
      setLoading(true);
      setError(null);

      try {
        const response = await fetcher({
          ...currentFilters,
          page: currentPage,
          pageSize: currentPageSize,
        });

        // Ignore stale responses if a newer request has already been issued
        if (requestId !== latestRequestId.current) {
          return;
        }

        setItems(response.items);
        setTotal(response.total);
        setTotalPages(response.totalPages);
        setLoading(false);
      } catch (err: unknown) {
        if (requestId !== latestRequestId.current) {
          return;
        }
        const message = err instanceof Error ? err.message : 'Đã có lỗi xảy ra khi tải dữ liệu';
        setError(message);
        setLoading(false);
      }
    },
    [fetcher],
  );

  // Trigger fetch whenever page, pageSize, or filters change
  useEffect(() => {
    fetchData(page, pageSize, filters);
  }, [fetchData, page, pageSize, filters]);

  const setFilters = useCallback(
    (filtersOrFn: TFilters | ((prev: TFilters) => TFilters)) => {
      setFiltersState((prev) => {
        const next = typeof filtersOrFn === 'function' ? (filtersOrFn as (p: TFilters) => TFilters)(prev) : filtersOrFn;
        return next;
      });
      // Changing filters always resets to page 1
      setPageState(1);
    },
    [],
  );

  const setPage = useCallback((newPage: number) => {
    setPageState(newPage);
  }, []);

  const setPageSize = useCallback((newPageSize: number) => {
    setPageSizeState(newPageSize);
    setPageState(1);
  }, []);

  const refetch = useCallback(() => {
    fetchData(page, pageSize, filtersRef.current);
  }, [fetchData, page, pageSize]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
    loading,
    error,
    filters,
    setFilters,
    setPage,
    setPageSize,
    refetch,
  };
}
