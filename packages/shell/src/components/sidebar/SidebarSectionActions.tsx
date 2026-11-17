import type { PropsWithChildren } from 'react';

import { useDeclaredPart } from '../../declare/useDeclaredPart.js';
import { sidebarSectionDeclarations } from '../../sidebar/sidebar-section-registry.js';
import { SidebarSectionIdContext } from './sidebar-section-context.js';

type SidebarSectionActionsProps = PropsWithChildren;

/** The buttons the section keeps beside its title: what it creates, what it opens. */
export function SidebarSectionActions({ children }: SidebarSectionActionsProps) {
    useDeclaredPart(
        {
            declarations: sidebarSectionDeclarations,
            misplaced: 'Sidebar section actions are declared inside a SidebarSection.',
            owner: SidebarSectionIdContext,
            part: 'actions',
        },
        children,
    );

    return null;
}
