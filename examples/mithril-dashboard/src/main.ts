import m from 'mithril';
import { QueryClient } from '@ts-query/core';
import { setQueryClient } from '@ts-query/mithril';
import App from './App';
import './style.css';

const queryClient = new QueryClient();
setQueryClient(queryClient);

m.mount(document.getElementById('app')!, App);
