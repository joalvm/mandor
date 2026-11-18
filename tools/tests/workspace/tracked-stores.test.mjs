import { describe, expect, it } from 'vitest';
import { createStore } from 'zustand/vanilla';

import { trackStores } from '../../workspace/tracked-stores.mjs';

describe('the stores a worker gives back to each file (trackStores)', () => {
    /**
     * The files of a worker share their modules, and a store is a module's: what one file left in
     * it, the next one found. Each file starts from the state the store was born with, which is
     * what a fresh module graph gave it.
     */
    it('returns every store it made to the state it was born with', () => {
        const tracked = trackStores(createStore);
        const counter = tracked.createStore(() => ({ count: 0 }));

        counter.setState({ count: 3 });
        tracked.resetStores();

        expect(counter.getState()).toEqual({ count: 0 });
    });

    /** The stores of the code are typed, and a typed store is made in two calls. */
    it('tracks a store made in two calls as well as in one', () => {
        const tracked = trackStores(createStore);
        const typed = tracked.createStore()(() => ({ open: false }));

        typed.setState({ open: true });
        tracked.resetStores();

        expect(typed.getState()).toEqual({ open: false });
    });

    /** A key a file added is a key the next file would find: the state is replaced, not merged. */
    it('drops what a file added to the state', () => {
        const tracked = trackStores(createStore);
        const store = tracked.createStore(() => ({ items: ['a'] }));

        store.setState({ extra: true, items: [] });
        tracked.resetStores();

        expect(store.getState()).toEqual({ items: ['a'] });
    });

    it('keeps the actions a store was born with', () => {
        const tracked = trackStores(createStore);
        const store = tracked.createStore((set) => ({
            count: 0,
            add: () => {
                set((state) => ({ count: state.count + 1 }));
            },
        }));

        store.getState().add();
        tracked.resetStores();
        store.getState().add();

        expect(store.getState().count).toBe(1);
    });
});
