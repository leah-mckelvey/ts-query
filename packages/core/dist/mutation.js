export class Mutation {
    constructor(options) {
        this.subscribers = new Set();
        this.state = {
            status: 'idle',
            data: undefined,
            error: null,
            isLoading: false,
            isSuccess: false,
            isError: false,
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
        // Use newStatus to handle cases where status is not in partial
        // This ensures boolean flags are always correct
        const newStatus = partial.status ?? this.state.status;
        this.state = {
            ...this.state,
            ...partial,
            status: newStatus,
            isLoading: newStatus === 'loading',
            isSuccess: newStatus === 'success',
            isError: newStatus === 'error',
        };
        this.notify();
    }
    async mutate(variables) {
        this.updateState({ status: 'loading' });
        try {
            const data = await this.options.mutationFn(variables);
            this.updateState({
                status: 'success',
                data,
                error: null,
            });
            this.options.onSuccess?.(data, variables);
            this.options.onSettled?.(data, null, variables);
            return data;
        }
        catch (error) {
            const err = error;
            this.updateState({
                status: 'error',
                error: err,
            });
            this.options.onError?.(err, variables);
            this.options.onSettled?.(undefined, err, variables);
            throw err;
        }
    }
    reset() {
        this.state = {
            status: 'idle',
            data: undefined,
            error: null,
            isLoading: false,
            isSuccess: false,
            isError: false,
        };
        this.notify();
    }
}
//# sourceMappingURL=mutation.js.map