import { Query } from './query';
import { Mutation } from './mutation';
import type { QueryKey, QueryOptions, MutationOptions } from './types';

export class QueryClient {
  private queries = new Map<string, Query<any, any>>();

  private getQueryKey(key: QueryKey): string {
    return typeof key === 'string' ? key : JSON.stringify(key);
  }

	  getQuery<TData = unknown, TError = Error>(
	    options: QueryOptions<TData, TError>
	  ): Query<TData, TError> {
	    const key = this.getQueryKey(options.queryKey);
	    
	    if (!this.queries.has(key)) {
	      const query = new Query<TData, TError>(options, () => {
	        // Only remove if this is still the active instance for this key.
	        const current = this.queries.get(key);
	        if (current === query) {
	          this.queries.delete(key);
	        }
	      });
	      this.queries.set(key, query);
	    }

	    return this.queries.get(key)!;
	  }

  invalidateQueries(queryKey?: QueryKey): void {
    if (queryKey) {
      const key = this.getQueryKey(queryKey);
      const query = this.queries.get(key);
      query?.invalidate();
    } else {
      // Invalidate all queries
      this.queries.forEach((query) => query.invalidate());
    }
  }

  removeQueries(queryKey?: QueryKey): void {
    if (queryKey) {
      const key = this.getQueryKey(queryKey);
      const query = this.queries.get(key);
      query?.destroy();
      this.queries.delete(key);
    } else {
      // Remove all queries
      this.queries.forEach((query) => query.destroy());
      this.queries.clear();
    }
  }

  createMutation<TData = unknown, TVariables = unknown, TError = Error>(
    options: MutationOptions<TData, TVariables, TError>
  ): Mutation<TData, TVariables, TError> {
    return new Mutation<TData, TVariables, TError>(options);
  }

  clear(): void {
    this.removeQueries();
  }
}

