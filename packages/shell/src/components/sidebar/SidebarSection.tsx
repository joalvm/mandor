import { useLayoutEffect, type PropsWithChildren } from 'react';

import {
    sidebarSectionDeclarations,
    type SidebarSectionLogic,
} from '../../sidebar/sidebar-section-registry.js';
import { SidebarSectionIdContext } from './sidebar-section-context.js';

/** The children are `SidebarSectionBody` and, if it has any, `SidebarSectionActions`. */
type SidebarSectionProps = PropsWithChildren<SidebarSectionLogic>;

/**
 * Declares a section of the lateral while it is mounted. The shell draws it in the order it
 * asks for, with its title; what it holds is the feature's own.
 */
export function SidebarSection({ children, ...logic }: SidebarSectionProps) {
    useLayoutEffect(() => sidebarSectionDeclarations.declare(logic));

    return <SidebarSectionIdContext value={logic.id}>{children}</SidebarSectionIdContext>;
}
