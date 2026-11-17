import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import { useSidebarSearch } from '../hooks/useSidebarSearch.js';

type SidebarSearchQuery = {
    /** What the field of the header carries. One field, so one place for it: the field and the
     * results it drives live in two different zones of the bar. */
    query: string;
};

// store-scope: window — the field of the sidebar is the window's, and a switch does not clear it.
const store = createStore<SidebarSearchQuery>(() => ({ query: '' }));

/** Writes what the field carries. The field calls it, the results read what it wrote. */
export function setSidebarSearchQuery(query: string): void {
    store.setState({ query });
}

/** The query of the field, live: the results follow it without a prop through the sidebar. */
export function useSidebarSearchQuery(): string {
    return useStore(store, (state) => state.query);
}

/**
 * Below the minimum the searcher declared, the sections stand; at or above it, the results
 * take the body of the bar. Without a searcher there is nothing to show, whatever is typed.
 */
export function useSidebarSearchResultsShown(): boolean {
    const query = useSidebarSearchQuery();
    const minimum = useSidebarSearch()?.minimumQuery;

    return minimum !== undefined && query.trim().length >= minimum;
}
