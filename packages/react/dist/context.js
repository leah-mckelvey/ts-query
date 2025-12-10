import React, { createContext, useContext } from 'react';
const QueryClientContext = createContext(undefined);
export function QueryClientProvider({ client, children }) {
    return (React.createElement(QueryClientContext.Provider, { value: client }, children));
}
export function useQueryClient() {
    const client = useContext(QueryClientContext);
    if (!client) {
        throw new Error('useQueryClient must be used within a QueryClientProvider');
    }
    return client;
}
//# sourceMappingURL=context.js.map