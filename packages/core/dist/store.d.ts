export type GetState<TState> = () => TState;
export type SetState<TState> = (partial: TState | Partial<TState> | ((state: TState) => TState | Partial<TState>), replace?: boolean) => void;
export type StoreListener<TState> = (state: TState, prevState: TState) => void;
export interface Store<TState> {
    getState: GetState<TState>;
    setState: SetState<TState>;
    subscribe: (listener: StoreListener<TState>) => () => void;
    destroy: () => void;
}
export type StateInitializer<TState> = (set: SetState<TState>, get: GetState<TState>) => TState;
export declare function createStore<TState>(initializer: StateInitializer<TState>): Store<TState>;
//# sourceMappingURL=store.d.ts.map