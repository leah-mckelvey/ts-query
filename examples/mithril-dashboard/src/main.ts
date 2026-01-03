import m from 'mithril';
import { QueryClient } from '@ts-query/core';
import { setQueryClient } from '@ts-query/mithril';
import App from './App';
import './style.css';

async function bootstrap() {
  if (import.meta.env.DEV) {
    const { worker } = await import('./mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
  }

  const queryClient = new QueryClient();
  setQueryClient(queryClient);

  m.mount(document.getElementById('app')!, App);
}

bootstrap();
