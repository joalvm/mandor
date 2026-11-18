import { describe, expect, it } from 'vitest';

import { initialSearchSlice, type SearchSlice } from '../src/search/search.slice.js';
import { createSearchStore } from '../src/search/search-store.js';
import type { SearchHit } from '../src/search/search-workspace.js';

const HIT: SearchHit = {
    matched: 'name',
    name: 'Pedido creado',
    resource: 'mandor://local/events/item/pedidos/pedido-creado',
    source: 'item',
    tags: [],
    trail: 'Pedidos',
};

describe('the store of the search hits', () => {
    it('starts empty, because nothing has been searched yet', () => {
        expect(initialSearchSlice()).toEqual<SearchSlice>({ hits: [] });
        expect(createSearchStore().getState().hits).toEqual([]);
    });

    it('keeps the hits the field published, each list whole', () => {
        const store = createSearchStore();

        store.getState().setHits([HIT]);

        expect(store.getState().hits).toEqual([HIT]);

        store.getState().setHits([HIT, HIT]);

        expect(store.getState().hits).toHaveLength(2);
    });

    /** One search of a window at a time: a reset leaves the slice as it was born. */
    it('comes back empty on reset', () => {
        const store = createSearchStore();

        store.getState().setHits([HIT]);
        store.getState().reset();

        expect(store.getState().hits).toEqual([]);
    });
});
