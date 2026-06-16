import { useEffect, useState, useRef } from 'react';

/**
 * Configuration for a subscription to an external data source.
 * Provides functions to get the current state and subscribe to updates.
 */
export interface SubscriptionConfig<T> {
  /** Function to get the current state synchronously */
  getCurrentState: () => T;
  /** Function to subscribe to state changes. Returns an unsubscribe function. */
  subscribe: (callback: (state: T) => void) => () => void;
}

/**
 * Represents an object that has subscribable state.
 * This is the core abstraction for Query, Mutation, and similar objects.
 */
export interface Subscribable<T> {
  state: T;
  subscribe: (callback: (state: T) => void) => () => void;
}

/**
 * Creates a subscription configuration from a subscribable object.
 * This embeds the "stateful subscribable" design pattern into a reusable form.
 *
 * @param subscribable - Any object with a state property and subscribe method
 * @returns A SubscriptionConfig that delegates to the subscribable
 */
export function createSubscriptionConfig<T>(
  subscribable: Subscribable<T>,
): SubscriptionConfig<T> {
  return {
    getCurrentState: () => subscribable.state,
    subscribe: (cb) => subscribable.subscribe(cb),
  };
}

/**
 * Generic hook for subscribing to external data sources.
 *
 * Handles the boilerplate of useState, useEffect, and preventing
 * state updates on unmounted components. This is the foundational
 * pattern for connecting external state (Query, Mutation, Fragment)
 * to React's rendering cycle.
 *
 * @param config - Configuration object with getCurrentState and subscribe functions
 * @returns The current state from the subscription
 *
 * @example
 * const state = useSubscription(createSubscriptionConfig(query));
 */
export function useSubscription<T>(config: SubscriptionConfig<T>): T {
  const { getCurrentState, subscribe } = config;
  const [state, setState] = useState(getCurrentState);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    // Sync in case state changed between render and effect
    setState(getCurrentState());

    const unsubscribe = subscribe((newState) => {
      if (isMountedRef.current) {
        setState(newState);
      }
    });

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [getCurrentState, subscribe]);

  return state;
}
