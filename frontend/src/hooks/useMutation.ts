import { useCallback, useState } from 'react';

export interface Mutation<TInput, TOutput> {
  execute: (input: TInput) => Promise<TOutput>;
  error: string | null;
  pending: boolean;
}

export function useMutation<TInput, TOutput>(
  mutate: (input: TInput) => Promise<TOutput>,
): Mutation<TInput, TOutput> {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (input: TInput) => {
    setPending(true);
    setError(null);
    try {
      return await mutate(input);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Thao tác thất bại.';
      setError(message);
      throw reason;
    } finally {
      setPending(false);
    }
  }, [mutate]);

  return { execute, error, pending };
}
