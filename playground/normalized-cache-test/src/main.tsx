import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient } from '@ts-query/core';
import { QueryClientProvider } from '@ts-query/react';
import App from './App';

// Create QueryClient with normalized cache enabled
const queryClient = new QueryClient({
  normalizedCache: true,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
