import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    declareSidebarSearch,
    focusSidebarSearch,
    holdSidebarSearchFocus,
    SIDEBAR_SEARCH_ID,
    sidebarSearchDeclarations,
} from '../../src/search/sidebar-search-registry.js';
import {
    setSidebarSearchQuery,
    useSidebarSearchQuery,
    useSidebarSearchResultsShown,
} from '../../src/search/sidebar-search-query.js';
import { SidebarSearchTakenError } from '../../src/search/sidebar-search-taken-error.js';

let unregister = (): void => undefined;

const SEARCH = { id: SIDEBAR_SEARCH_ID, minimumQuery: 2, owner: 'collection' };

function held() {
    return sidebarSearchDeclarations.get(SIDEBAR_SEARCH_ID);
}

function QueryHarness({ watch }: { watch: (query: string, shown: boolean) => void }): null {
    watch(useSidebarSearchQuery(), useSidebarSearchResultsShown());

    return null;
}

afterEach(() => {
    // The window goes first: its harnesses still hear the query and the focus going away.
    cleanup();
    unregister();
    holdSidebarSearchFocus(undefined);
    setSidebarSearchQuery('');
});

describe('the registry of the sidebar search', () => {
    it('answers for the search from its declaration until its cleanup runs', () => {
        expect(held()).toBeUndefined();

        unregister = declareSidebarSearch(SEARCH);

        expect(held()).toMatchObject(SEARCH);

        unregister();
        unregister = () => undefined;

        expect(held()).toBeUndefined();
    });

    it('refuses a second searcher, naming both owners', () => {
        unregister = declareSidebarSearch(SEARCH);

        expect(() => declareSidebarSearch({ ...SEARCH, owner: 'runner' })).toThrow(
            SidebarSearchTakenError,
        );
    });

    /** A re-render declares again under the same owner: that is the same searcher, not a clash. */
    it('lets its own owner declare the searcher again', () => {
        unregister = declareSidebarSearch(SEARCH);

        expect(() => {
            declareSidebarSearch({ ...SEARCH, minimumQuery: 3 })();
        }).not.toThrow();
    });

    /** The surface of the search focuses the field the sidebar is holding the ref of. */
    it('hands the focus of the field to whoever the sidebar handed its ref to', () => {
        const focus = vi.fn();

        holdSidebarSearchFocus(focus);
        focusSidebarSearch();

        expect(focus).toHaveBeenCalledTimes(1);

        holdSidebarSearchFocus(undefined);
        focusSidebarSearch();

        expect(focus).toHaveBeenCalledTimes(1);
    });

    it('shows the results only from the minimum the searcher declared', () => {
        let shown = '';
        const watch = (query: string, resultsShown: boolean): void => {
            shown = `${String(resultsShown)} ${query}`;
        };

        unregister = declareSidebarSearch(SEARCH);
        render(<QueryHarness watch={watch} />);

        expect(shown).toBe('false ');

        act(() => {
            setSidebarSearchQuery('p');
            setSidebarSearchQuery('pe');
        });

        expect(shown).toBe('true pe');

        act(() => {
            unregister();
            unregister = () => undefined;
            setSidebarSearchQuery('ped');
        });

        expect(shown).toBe('false ped');
    });

    it('carries the query of the field for the results drawn away from it', () => {
        let shown = '';
        const watch = (query: string, resultsShown: boolean): void => {
            shown = `${String(resultsShown)} ${query}`;
        };

        render(<QueryHarness watch={watch} />);
        act(() => {
            setSidebarSearchQuery('gateway');
        });

        expect(shown).toBe('false gateway');
    });
});
