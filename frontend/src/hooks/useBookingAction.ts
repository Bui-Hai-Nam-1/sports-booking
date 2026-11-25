import { useCallback, useState } from 'react';
import { extractErrorMessage } from '../lib/api';
import { isApiClientError } from '../types/booking';

export interface UseBookingActionResult<TInput, TOutput> {
  execute: (input: TInput) => Promise<TOutput>;
  pending: boolean;
  error: string | null;
  statusCode: number | null;
  lastResult: TOutput | null;
  reset: () => void;
}

/**
 * Generic mutation hook tracking pending state, HTTP conflict status, and result payload.
 */
export function useBookingAction<TInput, TOutput>(
  executor: (input: TInput) => Promise<TOutput>,
): UseBookingActionResult<TInput, TOutput> {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<TOutput | null>(null);

  const execute = useCallback(
    async (input: TInput): Promise<TOutput> => {
      setPending(true);
      setError(null);
      setStatusCode(null);
      try {
        const result = await executor(input);
        setLastResult(result);
        return result;
      } catch (reason) {
        setError(extractErrorMessage(reason));
        setStatusCode(isApiClientError(reason) ? (reason.status ?? null) : null);
        throw reason;
      } finally {
        setPending(false);
      }
    },
    [executor],
  );

  const reset = useCallback(() => {
    setError(null);
    setStatusCode(null);
    setLastResult(null);
  }, []);

  return {
    execute,
    pending,
    error,
    statusCode,
    lastResult,
    reset,
  };
}
