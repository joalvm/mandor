import { SidebarSection, SidebarSectionActions, SidebarSectionBody } from '@mandor/shell';
import type { PropsWithChildren } from 'react';
import { useStore } from 'zustand';

import { collectionStore } from '../../collection-store.js';
import { foldWorkspaceCollections } from '../../lib/fold-workspace-collections.js';
import { CollectionSidebar } from './CollectionSidebar.js';
import { CollectionsSectionActions } from './CollectionsSectionActions.js';
import { FoldCollectionsEntry } from './FoldCollectionsEntry.js';
import { NewCollectionEntry } from './NewCollectionEntry.js';

/** The section of the lateral that lists the items, which a tab of one shows itself in. */
export const COLLECTIONS_SECTION_ID = 'collections';

type CollectionsSectionProps = PropsWithChildren<{
    /** Where it sits among the other sections is of the app. */
    order: number;
}>;

/**
 * Puts the reusable work of the workspace in the lateral while it is mounted. The children are
 * what the app declares into it: `CollectionsSectionAction` for the header and
 * `CollectionRowAction` for the menu of the rows.
 *
 * It is the section that fills the lateral: whatever height the others leave is its own, so a
 * single collection already has the room to grow into. Folding it folds the whole tree, so it
 * opens again on its collections alone.
 */
export function CollectionsSection({ children, order }: CollectionsSectionProps) {
    const count = useStore(collectionStore, (state) => state.nodes.length);

    return (
        <SidebarSection
            count={count}
            fills
            id={COLLECTIONS_SECTION_ID}
            onFold={foldWorkspaceCollections}
            order={order}
            title="collections:heading"
        >
            <SidebarSectionActions>
                <NewCollectionEntry />
                <FoldCollectionsEntry />
                <CollectionsSectionActions />
            </SidebarSectionActions>
            <SidebarSectionBody>
                <CollectionSidebar />
            </SidebarSectionBody>
            {children}
        </SidebarSection>
    );
}
