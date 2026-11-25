import { useCallback, useRef, useState } from 'react';

export interface UseMutationOptions<TResult, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TResult>;
  onSuccess?: (data: TResult, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
}

export interface UseMutationResult<TResult, TVariables> {
  mutate: (variables: TVariables) => Promise<TResult | undefined>;
  isPending: boolean;
  result: TResult | null;
  error: string | null;
  reset: () => void;
}

export function useMutation<TResult, TVariables>({
  mutationFn,
  onSuccess,
  onError,
}: UseMutationOptions<TResult, TVariables>): UseMutationResult<TResult, TVariables> {
  const [isPending, setIsPending] = useState<boolean>(false);
  const [result, setResult] = useState<TResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isPendingRef = useRef<boolean>(false);

  const mutate = useCallback(
    async (variables: TVariables): Promise<TResult | undefined> => {
      // Guard against concurrent duplicate submissions
      if (isPendingRef.current) {
        return undefined;
      }

      isPendingRef.current = true;
      setIsPending(true);
      setError(null);

      try {
        const data = await mutationFn(variables);
        setResult(data);
        setIsPending(false);
        isPendingRef.current = false;
        if (onSuccess) {
          onSuccess(data, variables);
        }
        return data;
      } catch (err: unknown) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj.message);
        setIsPending(false);
        isPendingRef.current = false;
        if (onError) {
          onError(errorObj, variables);
        }
        throw errorObj;
      }
    },
    [mutationFn, onSuccess, onError],
  );

  const reset = useCallback(() => {
    setIsPending(false);
    isPendingRef.current = false;
    setResult(null);
    setError(null);
  }, []);

  return {
    mutate,
    isPending,
    result,
    error,
    reset,
  };
}
