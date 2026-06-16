// #######################################
// IMPORTS
// #######################################

import { useRef, useState, useEffect } from 'react';
import type { MutationOptions, MutationState } from '@ts-query/core';
import { useQueryClient } from './context';

// #######################################
// TYPE DEFINITIONS
// #######################################

export interface UseMutationResult<
  TData = unknown,
  TVariables = unknown,
  TError = Error,
> {
  mutate: (variables: TVariables) => Promise<TData>;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  reset: () => void;
  state: MutationState<TData, TError>;
}

// #######################################
// MUTATION HOOK
// #######################################

export function useMutation<
  TData = unknown,
  TVariables = unknown,
  TError = Error,
>(
  options: MutationOptions<TData, TVariables, TError>,
): UseMutationResult<TData, TVariables, TError> {
  const client = useQueryClient();
  const mutationRef = useRef(client.createMutation(options));
  const mutation = mutationRef.current;

  const [state, setState] = useState<MutationState<TData, TError>>(
    mutation.state,
  );

  useEffect(() => {
    const unsubscribe = mutation.subscribe({
      next: (newState) => setState(newState),
      error: (err) => console.error('Mutation observable error:', err),
    });
    return () => unsubscribe();
  }, [mutation]);

  // Mutation object is stable (from ref), so we can directly expose its methods.
  // Both mutate and mutateAsync point to the same method for API compatibility.
  return {
    mutate: mutation.mutate.bind(mutation),
    mutateAsync: mutation.mutate.bind(mutation),
    reset: mutation.reset.bind(mutation),
    state,
  };
}
