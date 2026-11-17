/**
 * Every store a test run makes, so the files that share a worker can each start from the state a
 * fresh module graph would have given them.
 *
 * The test config hands the code a `createStore` that goes through here, and the setup of each
 * file calls `resetStores`. Production never sees it.
 *
 * @template {(...args: never[]) => unknown} Create
 * @param {Create} create the `createStore` of zustand
 */
export function trackStores(create) {
    /** @type {{ getInitialState(): unknown; setState(state: unknown, replace: true): void }[]} */
    const stores = [];

    function createStore(initializer) {
        // `createStore<State>()(initializer)`: the first call only carries the type.
        if (initializer === undefined) {
            return (later) => createStore(later);
        }

        const store = create(initializer);

        stores.push(store);

        return store;
    }

    function resetStores() {
        for (const store of stores) {
            store.setState(store.getInitialState(), true);
        }
    }

    return { createStore: /** @type {Create} */ (createStore), resetStores };
}
