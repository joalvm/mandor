import { useMessages } from '@mandor/i18n';
import {
    bridge,
    fireAndForget,
    type SearchEntry,
    setSidebarSearchQuery,
    useShellStore,
    useSidebarSearchField,
    useSidebarSearchQuery,
} from '@mandor/shell';
import { SearchInput } from '@mandor/ui';
import { useCallback, useEffect, type KeyboardEvent } from 'react';

import { contentHits } from '../../search/content-hits.js';
import { openSearchHit } from '../../search/open-search-hit.js';
import { searchStore } from '../../search/search-store.js';
import { MIN_SEARCH_QUERY, searchWorkspace } from '../../search/search-workspace.js';

type SidebarSearchBarProps = {
    entries: () => SearchEntry[];
    onOpenEnvironment: (workspaceId: string, environmentId: string) => void;
};

/**
 * The field of the header. Typing publishes the query and the matches of memory at once; the
 * matches of content arrive behind them, after the wait, and land under the memory ones. Enter
 * opens the first hit wherever the list is standing.
 */
export function SidebarSearchBar({ entries, onOpenEnvironment }: SidebarSearchBarProps) {
    /** The ref of the editable, held by the sidebar and aimed at by the surface of the search. */
    const fieldRef = useSidebarSearchField();
    const messages = useMessages('collections');
    const query = useSidebarSearchQuery();
    const workspaceId = useShellStore((state) => state.activeWorkspaceId);

    const search = useCallback(
        (value: string): void => {
            setSidebarSearchQuery(value);
            searchStore.getState().setHits(searchWorkspace(entries(), value));
        },
        [entries],
    );

    useEffect(() => {
        if (workspaceId === null || query.trim().length < MIN_SEARCH_QUERY) {
            return undefined;
        }

        // An answer to a query the box no longer holds would cover the one to what it holds now.
        let current = true;
        const timer = window.setTimeout(() => {
            fireAndForget(
                bridge.collections.search({ query, workspaceId }).then((result) => {
                    if (result.ok && current) {
                        const listed = entries();

                        searchStore
                            .getState()
                            .setHits([
                                ...searchWorkspace(listed, query),
                                ...contentHits(listed, result.value),
                            ]);
                    }
                }),
            );
        }, 150);

        return () => {
            current = false;
            window.clearTimeout(timer);
        };
    }, [entries, query, search, workspaceId]);

    // The results of the workspace just left must not stand in for the one just opened.
    useEffect(() => {
        search('');

        return undefined;
    }, [search, workspaceId]);

    function onKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
        if (event.key !== 'Enter') {
            return;
        }

        const hit = searchStore.getState().hits[0];

        if (hit === undefined) {
            return;
        }

        event.preventDefault();
        openSearchHit(hit, event.altKey, onOpenEnvironment);
    }

    return (
        <div className="min-w-0 flex-1" data-part="search-field" onKeyDownCapture={onKeyDown}>
            <SearchInput
                editableRef={fieldRef}
                label={messages('searchLabel')}
                onValueChange={search}
                placeholder={messages('searchPlaceholder')}
                value={query}
            />
        </div>
    );
}
