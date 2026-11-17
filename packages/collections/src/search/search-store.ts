import { scopeToOrigin } from '@mandor/shell';
import { createStore, type StoreApi } from 'zustand/vanilla';

import { initialSearchSlice, type SearchSlice } from './search.slice.js';
import type { SearchHit } from './search-workspace.js';

type SearchActions = {
    reset: () => void;
    setHits: (hits: SearchHit[]) => void;
};

type SearchStore = SearchActions & SearchSlice;
export type SearchStoreApi = StoreApi<SearchStore>;

function actionsFor(set: SearchStoreApi['setState']): SearchActions {
    const actions: SearchActions = {
        reset: () => {
            set({ ...initialSearchSlice(), ...actions }, true);
        },
        setHits: (hits) => {
            set({ hits: [...hits] });
        },
    };

    return actions;
}

export function createSearchStore(): SearchStoreApi {
    return createStore<SearchStore>()((set) => {
        const actions = actionsFor(set);

        return { ...initialSearchSlice(), ...actions };
    });
}

export const searchStore = scopeToOrigin(createSearchStore());
