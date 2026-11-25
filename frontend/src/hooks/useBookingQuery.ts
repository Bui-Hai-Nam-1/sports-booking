import { useCallback, useEffect, useRef, useState } from 'react';
import { extractErrorMessage } from '../lib/api';

export interface UseBookingQueryOptions {
  enabled?: boolean;
  debounceMs?: number;
}

export interface UseBookingQueryResult<TResult> {
  data: TResult | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Generic query hook with debouncing and stale-request protection for availability & booking views.
 */
export function useBookingQuery<TParams, TResult>(
  fetcher: (params: TParams) => Promise<TResult>,
  params: TParams,
  options: UseBookingQueryOptions = {},
): UseBookingQueryResult<TResult> {
  const { enabled = true, debounceMs = 200 } = options;
  const [data, setData] = useState<TResult | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string | null>(null);
  const requestSeqRef = useRef(0);
  const serializedParams = JSON.stringify(params);
  const latestParamsRef = useRef(params);
  latestParamsRef.current = params;

  const executeFetch = useCallback(async () => {
    const requestId = ++requestSeqRef.current;
    setLoading(true);
    setError(null);
    try {
      const response = await fetcher(latestParamsRef.current);
      if (requestId === requestSeqRef.current) {
        setData(response);
      }
    } catch (reason) {
      if (requestId === requestSeqRef.current) {
        setError(extractErrorMessage(reason));
      }
    } finally {
      if (requestId === requestSeqRef.current) {
        setLoading(false);
      }
    }
  }, [fetcher]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      void executeFetch();
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [debounceMs, enabled, executeFetch, serializedParams]);

  return {
    data,
    loading,
    error,
    refetch: executeFetch,
  };
}
