import { SidebarSection, SidebarSectionActions, SidebarSectionBody } from '@mandor/shell';
import { useStore } from 'zustand';

import { docsStore } from '../../docs-store.js';
import { DocsSidebar } from './DocsSidebar.js';
import { NewDoc } from './NewDoc.js';

/** The name the lateral files the section under, and the one its fold is remembered by. */
export const DOCS_SECTION_ID = 'docs';

type DocsSectionProps = {
    /** Where it sits among the other sections is of the app. */
    order: number;
};

/** Puts the notes of the workspace in the lateral while it is mounted. */
export function DocsSection({ order }: DocsSectionProps) {
    const count = useStore(docsStore, (state) => state.docs.length);

    return (
        <SidebarSection count={count} id={DOCS_SECTION_ID} order={order} title="docs:heading">
            <SidebarSectionActions>
                <NewDoc />
            </SidebarSectionActions>
            <SidebarSectionBody>
                <DocsSidebar />
            </SidebarSectionBody>
        </SidebarSection>
    );
}
