import { use, type RefObject } from 'react';

import { SidebarSearchFieldContext } from '../search/sidebar-search-context.js';

/** The box the field stands in, so the field can hand it its focus. Read inside the header. */
export function useSidebarSearchField(): RefObject<HTMLSpanElement | null> {
    const field = use(SidebarSearchFieldContext);

    if (field === null) {
        throw new Error('useSidebarSearchField is only read inside the header of the sidebar.');
    }

    return field;
}
