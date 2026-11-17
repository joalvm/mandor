import type { PropsWithChildren } from 'react';

import { useDeclaredPart } from '../../declare/useDeclaredPart.js';
import { sidebarSectionDeclarations } from '../../sidebar/sidebar-section-registry.js';
import { SidebarSectionIdContext } from './sidebar-section-context.js';

type SidebarSectionBodyProps = PropsWithChildren;

/** What the section shows under its header while it is open. */
export function SidebarSectionBody({ children }: SidebarSectionBodyProps) {
    useDeclaredPart(
        {
            declarations: sidebarSectionDeclarations,
            misplaced: 'A sidebar section body is declared inside a SidebarSection.',
            owner: SidebarSectionIdContext,
            part: 'body',
        },
        children,
    );

    return null;
}
