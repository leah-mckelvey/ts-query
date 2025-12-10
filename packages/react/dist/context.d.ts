import React, { ReactNode } from 'react';
import { QueryClient } from '@ts-query/core';
export interface QueryClientProviderProps {
    client: QueryClient;
    children: ReactNode;
}
export declare function QueryClientProvider({ client, children }: QueryClientProviderProps): React.JSX.Element;
export declare function useQueryClient(): QueryClient;
//# sourceMappingURL=context.d.ts.map