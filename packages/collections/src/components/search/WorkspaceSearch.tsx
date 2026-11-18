import { useTranslator } from '@mandor/i18n';
import {
    focusSidebarSearch,
    registerSurface,
    setSidebarSearchQuery,
    SidebarSearch,
    SidebarSearchField,
    SidebarSearchResults,
    type WorkspaceEntries,
} from '@mandor/shell';
import { useCallback, useEffect } from 'react';

import { searchStore } from '../../search/search-store.js';
import { MIN_SEARCH_QUERY } from '../../search/search-workspace.js';
import { workspaceEntries } from '../../search/workspace-entries.js';
import { SearchResults } from './SearchResults.js';
import { SidebarSearchBar } from './SidebarSearchBar.js';

export const SEARCH_SURFACE = 'search';

type WorkspaceSearchProps = {
    /** What the other features bring to the search, beside the items collection brings itself. */
    sources: readonly WorkspaceEntries[];
    /** Where an environment hit goes: the dialog of environments, which the app owns. */
    openEnvironment: (workspaceId: string, environmentId: string) => void;
};

/**
 * Declares the searcher of the sidebar: the field in the header and the results that take the
 * body while the query carries. It also answers for the surface of the search, whose whole job
 * is putting the caret back in the field. The app lists who brings entries; which workspace and
 * which origin they are for is worked out here, once.
 */
export function WorkspaceSearch({ sources, openEnvironment }: WorkspaceSearchProps) {
    const translate = useTranslator();
    const entries = useCallback(() => workspaceEntries(sources, translate), [sources, translate]);

    useEffect(() => {
        const unregisterSurface = registerSurface({
            id: SEARCH_SURFACE,
            open: () => {
                focusSidebarSearch();
            },
        });

        return () => {
            unregisterSurface();
            setSidebarSearchQuery('');
            searchStore.getState().reset();
        };
    }, []);

    return (
        <SidebarSearch minimumQuery={MIN_SEARCH_QUERY} owner="collection">
            <SidebarSearchField>
                <SidebarSearchBar entries={entries} onOpenEnvironment={openEnvironment} />
            </SidebarSearchField>
            <SidebarSearchResults>
                <SearchResults onOpenEnvironment={openEnvironment} />
            </SidebarSearchResults>
        </SidebarSearch>
    );
}
