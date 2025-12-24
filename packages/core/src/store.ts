export type GetState<TState> = () => TState;

export type SetState<TState> = (
  partial:
    | TState
    | Partial<TState>
    | ((state: TState) => TState | Partial<TState>),
  replace?: boolean,
) => void;

export type StoreListener<TState> = (state: TState, prevState: TState) => void;

export interface Store<TState> {
  getState: GetState<TState>;
  setState: SetState<TState>;
  subscribe: (listener: StoreListener<TState>) => () => void;
  destroy: () => void;
}

export type StateInitializer<TState> = (
  set: SetState<TState>,
  get: GetState<TState>,
) => TState;

export function createStore<TState>(
  initializer: StateInitializer<TState>,
): Store<TState> {
  let state: TState;
  const listeners = new Set<StoreListener<TState>>();

  const getState: GetState<TState> = () => state;

  const setState: SetState<TState> = (partial, replace) => {
    const prevState = state;

    const nextStateValue =
      typeof partial === 'function'
        ? (partial as (state: TState) => TState | Partial<TState>)(prevState)
        : partial;

    if (nextStateValue === prevState) {
      return;
    }

    let nextState: TState;

    if (
      replace ||
      typeof nextStateValue !== 'object' ||
      nextStateValue === null
    ) {
      nextState = nextStateValue as TState;
    } else {
      // Shallow merge for object states when not replacing
      nextState = {
        ...(prevState as TState & object),
        ...(nextStateValue as TState & object),
      } as TState;
    }

    state = nextState;

    listeners.forEach((listener) => listener(state, prevState));
  };

  const subscribe = (listener: StoreListener<TState>): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const destroy = (): void => {
    listeners.clear();
  };

  state = initializer(setState, getState);

  return {
    getState,
    setState,
    subscribe,
    destroy,
  };
}
