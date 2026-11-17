import { createStore, type StoreApi } from 'zustand/vanilla';
import { describe, expect, it } from 'vitest';

import { dropOriginState, onOriginLeft, scopeToOrigin } from '../../src/origin/origin-scope.js';

type Counter = { count: number };

function counter(): StoreApi<Counter> {
    return createStore<Counter>(() => ({ count: 0 }));
}

describe('what an origin feeds', () => {
    it('sends every store scoped to the origin back to its initial state', () => {
        const first = scopeToOrigin(counter());
        const second = scopeToOrigin(counter());

        first.setState({ count: 3 });
        second.setState({ count: 5 });
        dropOriginState();

        expect([first.getState().count, second.getState().count]).toEqual([0, 0]);
    });

    it('leaves alone a store nobody scoped to the origin', () => {
        const window = counter();

        window.setState({ count: 2 });
        dropOriginState();

        expect(window.getState().count).toBe(2);
    });

    it('calls what lives outside a store once the stores are back, until it is taken off', () => {
        const store = scopeToOrigin(counter());
        const seen: number[] = [];
        const off = onOriginLeft(() => seen.push(store.getState().count));

        store.setState({ count: 4 });
        dropOriginState();
        off();
        dropOriginState();

        expect(seen).toEqual([0]);
    });

    it('hands back the very store it was given', () => {
        const store = counter();

        expect(scopeToOrigin(store)).toBe(store);
    });
});
