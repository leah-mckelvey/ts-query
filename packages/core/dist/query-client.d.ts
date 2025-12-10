import { Query } from './query';
import { Mutation } from './mutation';
import type { QueryKey, QueryOptions, MutationOptions } from './types';
export declare class QueryClient {
    private queries;
    private getQueryKey;
    getQuery<TData = unknown, TError = Error>(options: QueryOptions<TData, TError>): Query<TData, TError>;
    invalidateQueries(queryKey?: QueryKey): void;
    removeQueries(queryKey?: QueryKey): void;
    createMutation<TData = unknown, TVariables = unknown, TError = Error>(options: MutationOptions<TData, TVariables, TError>): Mutation<TData, TVariables, TError>;
    clear(): void;
}
//# sourceMappingURL=query-client.d.ts.map