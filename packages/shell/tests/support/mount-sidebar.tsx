import { render } from '@testing-library/react';
import type { ReactNode } from 'react';

import {
    SidebarSearch,
    SidebarSearchField,
    SidebarSearchResults,
    SidebarSection,
    SidebarSectionActions,
    SidebarSectionBody,
} from '../../src/index.js';
import type { SidebarSearchLogic } from '../../src/search/sidebar-search-registry.js';
import type { SidebarSectionLogic } from '../../src/sidebar/sidebar-section-registry.js';

type SectionDeclaration = SidebarSectionLogic & { actions?: ReactNode; body: ReactNode };

type SearchDeclaration = Omit<SidebarSearchLogic, 'id'> & { field: ReactNode; results: ReactNode };

/** Declares a section the way a feature does, in a tree of its own; the cleanup unmounts it. */
export function mountSidebarSection({ actions, body, ...logic }: SectionDeclaration): () => void {
    return render(
        <SidebarSection {...logic}>
            {actions !== undefined && <SidebarSectionActions>{actions}</SidebarSectionActions>}
            <SidebarSectionBody>{body}</SidebarSectionBody>
        </SidebarSection>,
    ).unmount;
}

/** Declares the searcher the way a feature does, in a tree of its own; the cleanup unmounts it. */
export function mountSidebarSearch({ field, results, ...logic }: SearchDeclaration): () => void {
    return render(
        <SidebarSearch {...logic}>
            <SidebarSearchField>{field}</SidebarSearchField>
            <SidebarSearchResults>{results}</SidebarSearchResults>
        </SidebarSearch>,
    ).unmount;
}
