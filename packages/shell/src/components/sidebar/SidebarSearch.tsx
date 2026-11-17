import { useLayoutEffect, type PropsWithChildren } from 'react';

import { SidebarSearchIdContext } from '../../search/sidebar-search-context.js';
import {
    declareSidebarSearch,
    SIDEBAR_SEARCH_ID,
    type SidebarSearchLogic,
} from '../../search/sidebar-search-registry.js';

/** The children are `SidebarSearchField` and `SidebarSearchResults`. */
type SidebarSearchProps = PropsWithChildren<Omit<SidebarSearchLogic, 'id'>>;

/** Declares the searcher of the sidebar while it is mounted: its field and its results. */
export function SidebarSearch({ children, ...logic }: SidebarSearchProps) {
    useLayoutEffect(() => declareSidebarSearch({ ...logic, id: SIDEBAR_SEARCH_ID }));

    return <SidebarSearchIdContext value={SIDEBAR_SEARCH_ID}>{children}</SidebarSearchIdContext>;
}
