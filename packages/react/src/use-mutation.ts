import { useEffect, useState, useCallback, useRef } from 'react';
import type { MutationOptions, MutationState } from '@ts-query/core';
import { useQueryClient } from './context';

export interface UseMutationResult<TData = unknown, TVariables = unknown, TError = Error> {
  mutate: (variables: TVariables) => Promise<TData>;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  reset: () => void;
  state: MutationState<TData, TError>;
}

export function useMutation<TData = unknown, TVariables = unknown, TError = Error>(
  options: MutationOptions<TData, TVariables, TError>
): UseMutationResult<TData, TVariables, TError> {
  const client = useQueryClient();
  const mutationRef = useRef(client.createMutation(options));
  const mutation = mutationRef.current;
  
  const [state, setState] = useState<MutationState<TData, TError>>(mutation.state);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    
    const unsubscribe = mutation.subscribe((newState) => {
      if (isMountedRef.current) {
        setState(newState);
      }
    });

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [mutation]);

  const mutate = useCallback(
    async (variables: TVariables) => {
      return mutation.mutate(variables);
    },
    [mutation]
  );

  const reset = useCallback(() => {
    mutation.reset();
  }, [mutation]);

  return {
    mutate,
    mutateAsync: mutate,
    reset,
    state,
  };
}

