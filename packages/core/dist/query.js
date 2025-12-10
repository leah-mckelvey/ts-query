export class Query {
    constructor(options) {
        this.subscribers = new Set();
        this.abortController = null;
        this.staleTimeout = null;
        this.cacheTimeout = null;
        this.retryCount = 0;
        this.state = {
            status: 'idle',
            data: undefined,
            error: null,
            isLoading: false,
            isSuccess: false,
            isError: false,
            isFetching: false,
            isStale: false,
        };
        this.options = options;
    }
    subscribe(subscriber) {
        this.subscribers.add(subscriber);
        return () => {
            this.subscribers.delete(subscriber);
        };
    }
    notify() {
        this.subscribers.forEach((subscriber) => subscriber(this.state));
    }
    updateState(partial) {
        const newStatus = partial.status ?? this.state.status;
        this.state = {
            ...this.state,
            ...partial,
            status: newStatus,
            isLoading: newStatus === 'loading',
            isSuccess: newStatus === 'success',
            isError: newStatus === 'error',
            isFetching: partial.isFetching ?? this.state.isFetching,
            isStale: partial.isStale ?? this.state.isStale,
        };
        this.notify();
    }
    async fetch() {
        // Cancel any in-flight request
        if (this.abortController) {
            this.abortController.abort();
        }
        this.abortController = new AbortController();
        this.updateState({ status: 'loading', isFetching: true });
        try {
            const data = await this.options.queryFn();
            this.retryCount = 0;
            this.updateState({
                status: 'success',
                data,
                error: null,
                isFetching: false,
            });
            this.options.onSuccess?.(data);
            this.scheduleStale();
            this.scheduleGarbageCollection();
            return data;
        }
        catch (error) {
            const err = error;
            // Retry logic
            const maxRetries = this.options.retry ?? 3;
            if (this.retryCount < maxRetries) {
                this.retryCount++;
                const delay = this.options.retryDelay ?? Math.min(1000 * 2 ** this.retryCount, 30000);
                await new Promise((resolve) => setTimeout(resolve, delay));
                return this.fetch();
            }
            this.updateState({
                status: 'error',
                error: err,
                isFetching: false,
            });
            this.options.onError?.(err);
            throw err;
        }
    }
    invalidate() {
        this.clearStaleTimeout();
        this.fetch();
    }
    scheduleStale() {
        this.clearStaleTimeout();
        const staleTime = this.options.staleTime ?? 0;
        // Mark data as fresh immediately
        this.updateState({ isStale: false });
        // Schedule marking as stale after staleTime
        if (staleTime > 0) {
            this.staleTimeout = setTimeout(() => {
                this.updateState({ isStale: true });
            }, staleTime);
        }
        else {
            // If staleTime is 0, data is immediately stale
            this.updateState({ isStale: true });
        }
    }
    scheduleGarbageCollection() {
        this.clearCacheTimeout();
        const cacheTime = this.options.cacheTime ?? 5 * 60 * 1000; // 5 minutes default
        this.cacheTimeout = setTimeout(() => {
            if (this.subscribers.size === 0) {
                this.destroy();
            }
        }, cacheTime);
    }
    clearStaleTimeout() {
        if (this.staleTimeout) {
            clearTimeout(this.staleTimeout);
            this.staleTimeout = null;
        }
    }
    clearCacheTimeout() {
        if (this.cacheTimeout) {
            clearTimeout(this.cacheTimeout);
            this.cacheTimeout = null;
        }
    }
    destroy() {
        this.clearStaleTimeout();
        this.clearCacheTimeout();
        this.abortController?.abort();
        this.subscribers.clear();
    }
}
//# sourceMappingURL=query.js.map