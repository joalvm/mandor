import { useDeclared } from '../declare/useDeclared.js';
import {
    SIDEBAR_SEARCH_ID,
    sidebarSearchDeclarations,
    type SidebarSearchSpec,
} from '../search/sidebar-search-registry.js';

/** The searcher of the sidebar, or nothing while nobody declared one. */
export function useSidebarSearch(): SidebarSearchSpec | undefined {
    return useDeclared(sidebarSearchDeclarations, SIDEBAR_SEARCH_ID);
}
