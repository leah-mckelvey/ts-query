import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient } from '@ts-query/core';
import { QueryClientProvider } from '@ts-query/react';
import './index.css';
import App from './App.tsx';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
