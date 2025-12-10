import type { QueryOptions, QueryState, Subscriber } from './types';
export declare class Query<TData = unknown, TError = Error> {
    private subscribers;
    private options;
    private staleTimeout;
    private cacheTimeout;
    private retryCount;
    state: QueryState<TData, TError>;
    constructor(options: QueryOptions<TData, TError>);
    subscribe(subscriber: Subscriber<QueryState<TData, TError>>): () => void;
    private notify;
    private updateState;
    fetch(): Promise<TData>;
    invalidate(): void;
    private scheduleStale;
    private scheduleGarbageCollection;
    private clearStaleTimeout;
    private clearCacheTimeout;
    destroy(): void;
}
//# sourceMappingURL=query.d.ts.map