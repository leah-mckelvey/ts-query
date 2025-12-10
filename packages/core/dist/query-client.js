import { Query } from './query';
import { Mutation } from './mutation';
export class QueryClient {
    constructor() {
        this.queries = new Map();
    }
    getQueryKey(key) {
        return typeof key === 'string' ? key : JSON.stringify(key);
    }
    getQuery(options) {
        const key = this.getQueryKey(options.queryKey);
        if (!this.queries.has(key)) {
            const query = new Query(options);
            this.queries.set(key, query);
        }
        return this.queries.get(key);
    }
    invalidateQueries(queryKey) {
        if (queryKey) {
            const key = this.getQueryKey(queryKey);
            const query = this.queries.get(key);
            query?.invalidate();
        }
        else {
            // Invalidate all queries
            this.queries.forEach((query) => query.invalidate());
        }
    }
    removeQueries(queryKey) {
        if (queryKey) {
            const key = this.getQueryKey(queryKey);
            const query = this.queries.get(key);
            query?.destroy();
            this.queries.delete(key);
        }
        else {
            // Remove all queries
            this.queries.forEach((query) => query.destroy());
            this.queries.clear();
        }
    }
    createMutation(options) {
        return new Mutation(options);
    }
    clear() {
        this.removeQueries();
    }
}
//# sourceMappingURL=query-client.js.map