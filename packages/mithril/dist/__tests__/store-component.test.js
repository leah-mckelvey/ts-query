import m from 'mithril';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createStore } from '../../../core/src/store';
import { createStoreComponent } from '../store-component';
function createCounterStore() {
    return createStore((set) => ({
        count: 0,
        increment: () => set((state) => ({ count: state.count + 1 })),
    }));
}
describe('Mithril createStoreComponent', () => {
    let container;
    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });
    afterEach(() => {
        m.mount(container, null);
        document.body.removeChild(container);
    });
    it('should render initial selected state and respond to store updates', () => {
        const counterStore = createCounterStore();
        const StoreComponent = createStoreComponent(counterStore, (state) => state.count);
        const App = {
            view: () => m(StoreComponent, {
                children: (count) => m('div', `Count: ${count}`),
            }),
        };
        m.mount(container, App);
        expect(container.textContent).toBe('Count: 0');
        counterStore.getState().increment();
        m.redraw.sync();
        expect(container.textContent).toBe('Count: 1');
    });
    it('should allow multiple components to share the same store', () => {
        const counterStore = createCounterStore();
        const StoreComponent = createStoreComponent(counterStore, (state) => state.count);
        const App = {
            view: () => m('div', [
                m(StoreComponent, {
                    children: (count) => m('div.first', `First: ${count}`),
                }),
                m(StoreComponent, {
                    children: (count) => m('div.second', `Second: ${count}`),
                }),
            ]),
        };
        m.mount(container, App);
        const first = container.querySelector('.first');
        const second = container.querySelector('.second');
        expect(first?.textContent).toBe('First: 0');
        expect(second?.textContent).toBe('Second: 0');
        counterStore.getState().increment();
        m.redraw.sync();
        expect(first?.textContent).toBe('First: 1');
        expect(second?.textContent).toBe('Second: 1');
    });
});
//# sourceMappingURL=store-component.test.js.map