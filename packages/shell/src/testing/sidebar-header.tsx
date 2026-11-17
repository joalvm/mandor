import { useRef, type PropsWithChildren } from 'react';

import { SidebarSearchFieldContext } from '../search/sidebar-search-context.js';

type SidebarHeaderProps = PropsWithChildren;

/**
 * The header of the sidebar without the sidebar: the box a searcher's field reaches with
 * `useSidebarSearchField`, for a test that draws the field alone.
 */
export function SidebarHeader({ children }: SidebarHeaderProps) {
    const field = useRef<HTMLSpanElement | null>(null);

    return <SidebarSearchFieldContext value={field}>{children}</SidebarSearchFieldContext>;
}
