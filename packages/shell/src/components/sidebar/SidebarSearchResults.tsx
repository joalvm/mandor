import type { PropsWithChildren } from 'react';

import { useDeclaredPart } from '../../declare/useDeclaredPart.js';
import { SidebarSearchIdContext } from '../../search/sidebar-search-context.js';
import { sidebarSearchDeclarations } from '../../search/sidebar-search-registry.js';

type SidebarSearchResultsProps = PropsWithChildren;

/** What the sidebar shows over its sections while the query is long enough to ask for it. */
export function SidebarSearchResults({ children }: SidebarSearchResultsProps) {
    useDeclaredPart(
        {
            declarations: sidebarSearchDeclarations,
            misplaced: 'Sidebar search results are declared inside a SidebarSearch.',
            owner: SidebarSearchIdContext,
            part: 'results',
        },
        children,
    );

    return null;
}
