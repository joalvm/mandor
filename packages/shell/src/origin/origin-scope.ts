import type { StoreApi } from 'zustand/vanilla';

const STORES = new Set<() => void>();
const LEAVING = new Set<() => void>();
let left = 0;

/**
 * Marks a store as holding what the open origin fed: it goes back to its initial state when the
 * origin is left. Returns the same store, so it wraps the creation in place.
 */
export function scopeToOrigin<Store extends StoreApi<State>, State = ReturnType<Store['getState']>>(
    store: Store,
): Store {
    STORES.add(() => {
        store.setState(store.getInitialState(), true);
    });

    return store;
}

/** For what lives outside a store (a cache of the module): runs when the origin is left. */
export function onOriginLeft(callback: () => void): () => void {
    LEAVING.add(callback);

    return () => {
        LEAVING.delete(callback);
    };
}

/** How many origins the window has left: what a read compares to know it still has one. */
export function originsLeft(): number {
    return left;
}

/** Lets go of everything the origin being left fed: each scoped store, then each callback. */
export function dropOriginState(): void {
    left += 1;

    for (const reset of STORES) {
        reset();
    }

    for (const callback of LEAVING) {
        callback();
    }
}
