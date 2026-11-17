import { useEffect, useRef, type RefObject } from 'react';

import { useShellStore } from '../../hooks/useShellStore.js';
import { useSidebarSearch } from '../../hooks/useSidebarSearch.js';
import { SidebarSearchFieldContext } from '../../search/sidebar-search-context.js';
import { holdSidebarSearchFocus } from '../../search/sidebar-search-registry.js';
import { useSidebarSearchResultsShown } from '../../search/sidebar-search-query.js';
import { SidebarFoldSections } from './SidebarFoldSections.js';
import { SidebarSections } from './SidebarSections.js';

/**
 * The lateral of the window: the field of the search on top, with the button that folds every
 * section at its end, and the registered sections under it.
 * While the query asks for results they take the body of the bar; the sections come back the
 * moment the field empties. Who searches and what a hit opens are not known here.
 *
 * Which sections are folded, and how much room each open one takes, are part of how the window
 * was left, so they are read and written where the session keeps them and not handed down from
 * whoever drew the lateral. The room is kept per workspace: each one is arranged for what it holds.
 */
export function Sidebar() {
    const search = useSidebarSearch();
    const fieldRef = useRef<HTMLSpanElement | null>(null);
    const resultsShown = useSidebarSearchResultsShown();

    useEffect(() => {
        holdSidebarSearchFocus(() => {
            fieldRef.current?.focus();
        });

        return () => {
            holdSidebarSearchFocus(undefined);
        };
    }, []);

    return (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col h-full" data-part="sidebar-content">
            <SidebarHeader fieldRef={fieldRef} search={search} />
            <SidebarBody resultsShown={resultsShown} search={search} />
        </div>
    );
}

type SidebarSearch = ReturnType<typeof useSidebarSearch>;

type SidebarHeaderProps = {
    fieldRef: RefObject<HTMLSpanElement | null>;
    search: SidebarSearch;
};

function SidebarHeader({ fieldRef, search }: SidebarHeaderProps) {
    if (search === undefined) {
        return null;
    }

    return (
        <div
            className="flex h-header shrink-0 items-center gap-gap-control px-pad-panel"
            data-part="sidebar-header"
        >
            <SidebarSearchFieldContext value={fieldRef}>{search.field}</SidebarSearchFieldContext>
            <SidebarFoldSections />
        </div>
    );
}

type SidebarBodyProps = {
    resultsShown: boolean;
    search: SidebarSearch;
};

/** The sections are read and written where the session keeps them, so only this part reads them. */
function SidebarBody({ resultsShown, search }: SidebarBodyProps) {
    const collapsed = useShellStore((state) => state.panels.collapsedSections);
    const setPanels = useShellStore((state) => state.setPanels);

    if (search !== undefined && resultsShown) {
        return search.results;
    }

    return (
        <SidebarSections
            collapsed={collapsed}
            onCollapsedChange={(collapsedSections) => {
                setPanels({ collapsedSections });
            }}
        />
    );
}
