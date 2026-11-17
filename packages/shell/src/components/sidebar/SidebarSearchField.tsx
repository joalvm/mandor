import type { PropsWithChildren } from 'react';

import { useDeclaredPart } from '../../declare/useDeclaredPart.js';
import { SidebarSearchIdContext } from '../../search/sidebar-search-context.js';
import { sidebarSearchDeclarations } from '../../search/sidebar-search-registry.js';

type SidebarSearchFieldProps = PropsWithChildren;

/**
 * The field the header of the sidebar draws. It reaches the box it stands in with
 * `useSidebarSearchField`.
 */
export function SidebarSearchField({ children }: SidebarSearchFieldProps) {
    useDeclaredPart(
        {
            declarations: sidebarSearchDeclarations,
            misplaced: 'A sidebar search field is declared inside a SidebarSearch.',
            owner: SidebarSearchIdContext,
            part: 'field',
        },
        children,
    );

    return null;
}
