let globalQueryClient;
export function setQueryClient(client) {
    globalQueryClient = client;
}
export function getQueryClient() {
    if (!globalQueryClient) {
        throw new Error('QueryClient not set. Call setQueryClient() before using queries.');
    }
    return globalQueryClient;
}
//# sourceMappingURL=query-client-provider.js.map