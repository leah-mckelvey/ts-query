import m from 'mithril';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient } from '@ts-query/core';
import { setQueryClient } from '../query-client-provider';
import { createMutationComponent } from '../use-mutation';
describe('Mithril useMutation', () => {
    let container;
    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });
    afterEach(() => {
        m.mount(container, null);
        document.body.removeChild(container);
    });
    it('should execute mutation and show success', async () => {
        const queryClient = new QueryClient();
        setQueryClient(queryClient);
        const mutationFn = vi.fn(async (data) => {
            await new Promise(resolve => setTimeout(resolve, 10));
            return `Result: ${data}`;
        });
        const MutationComponent = createMutationComponent({
            mutationFn,
        });
        const App = {
            view: () => m(MutationComponent, {
                children: (mutation) => m('div', [
                    m('button', {
                        onclick: () => mutation.mutate('test').catch(() => { }),
                    }, mutation.state.isLoading ? 'Loading...' : 'Mutate'),
                    mutation.state.isSuccess && m('div.success', `Data: ${mutation.state.data}`),
                    mutation.state.isError && m('div.error', `Error: ${mutation.state.error?.message}`),
                ]),
            }),
        };
        m.mount(container, App);
        const button = container.querySelector('button');
        expect(button?.textContent).toBe('Mutate');
        // Click button to trigger mutation
        button?.click();
        // Wait a tick for the mutation to start
        await new Promise(resolve => setTimeout(resolve, 5));
        m.redraw.sync();
        expect(button?.textContent).toBe('Loading...');
        // Wait for mutation to complete
        await new Promise(resolve => setTimeout(resolve, 50));
        m.redraw.sync();
        expect(button?.textContent).toBe('Mutate');
        const successDiv = container.querySelector('.success');
        expect(successDiv?.textContent).toBe('Data: Result: test');
        expect(mutationFn).toHaveBeenCalledWith('test');
    });
    it('should handle mutation errors', async () => {
        const queryClient = new QueryClient();
        setQueryClient(queryClient);
        const mutationFn = vi.fn(async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
            throw new Error('Mutation failed');
        });
        const MutationComponent = createMutationComponent({
            mutationFn,
        });
        const App = {
            view: () => m(MutationComponent, {
                children: (mutation) => m('div', [
                    m('button', {
                        onclick: () => mutation.mutate('test').catch(() => { }),
                    }, mutation.state.isLoading ? 'Loading...' : 'Mutate'),
                    mutation.state.isError && m('div.error', `Error: ${mutation.state.error?.message}`),
                ]),
            }),
        };
        m.mount(container, App);
        const button = container.querySelector('button');
        button?.click();
        // Wait a tick for the mutation to start
        await new Promise(resolve => setTimeout(resolve, 5));
        m.redraw.sync();
        expect(button?.textContent).toBe('Loading...');
        // Wait for mutation to fail
        await new Promise(resolve => setTimeout(resolve, 50));
        m.redraw.sync();
        const errorDiv = container.querySelector('.error');
        expect(errorDiv?.textContent).toBe('Error: Mutation failed');
    });
    it('should call onSuccess callback', async () => {
        const queryClient = new QueryClient();
        setQueryClient(queryClient);
        const onSuccess = vi.fn();
        const mutationFn = vi.fn(async (data) => {
            await new Promise(resolve => setTimeout(resolve, 10));
            return `Result: ${data}`;
        });
        const MutationComponent = createMutationComponent({
            mutationFn,
            onSuccess,
        });
        const App = {
            view: () => m(MutationComponent, {
                children: (mutation) => m('button', {
                    onclick: () => mutation.mutate('test').catch(() => { }),
                }, 'Mutate'),
            }),
        };
        m.mount(container, App);
        const button = container.querySelector('button');
        button?.click();
        // Wait for mutation to complete
        await new Promise(resolve => setTimeout(resolve, 50));
        expect(onSuccess).toHaveBeenCalledWith('Result: test', 'test');
    });
    it('should call onError callback', async () => {
        const queryClient = new QueryClient();
        setQueryClient(queryClient);
        const onError = vi.fn();
        const mutationFn = vi.fn(async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
            throw new Error('Mutation failed');
        });
        const MutationComponent = createMutationComponent({
            mutationFn,
            onError,
        });
        const App = {
            view: () => m(MutationComponent, {
                children: (mutation) => m('button', {
                    onclick: () => mutation.mutate('test').catch(() => { }),
                }, 'Mutate'),
            }),
        };
        m.mount(container, App);
        const button = container.querySelector('button');
        button?.click();
        // Wait for mutation to fail
        await new Promise(resolve => setTimeout(resolve, 50));
        expect(onError).toHaveBeenCalled();
        expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    });
    it('should reset mutation state', async () => {
        const queryClient = new QueryClient();
        setQueryClient(queryClient);
        const mutationFn = vi.fn(async (data) => {
            await new Promise(resolve => setTimeout(resolve, 10));
            return `Result: ${data}`;
        });
        const MutationComponent = createMutationComponent({
            mutationFn,
        });
        let resetFn = null;
        const App = {
            view: () => m(MutationComponent, {
                children: (mutation) => {
                    resetFn = mutation.reset;
                    return m('div', [
                        m('button.mutate', {
                            onclick: () => mutation.mutate('test').catch(() => { }),
                        }, mutation.state.isLoading ? 'Loading...' : 'Mutate'),
                        m('button.reset', {
                            onclick: () => mutation.reset(),
                        }, 'Reset'),
                        mutation.state.isSuccess && m('div.success', 'Success'),
                    ]);
                },
            }),
        };
        m.mount(container, App);
        const mutateButton = container.querySelector('.mutate');
        mutateButton?.click();
        // Wait a tick for the mutation to start
        await new Promise(resolve => setTimeout(resolve, 5));
        m.redraw.sync();
        expect(mutateButton?.textContent).toBe('Loading...');
        // Wait for mutation to complete
        await new Promise(resolve => setTimeout(resolve, 50));
        m.redraw.sync();
        expect(container.querySelector('.success')).toBeTruthy();
        // Reset
        const resetButton = container.querySelector('.reset');
        resetButton?.click();
        m.redraw.sync();
        expect(container.querySelector('.success')).toBeFalsy();
    });
});
//# sourceMappingURL=use-mutation.test.js.map