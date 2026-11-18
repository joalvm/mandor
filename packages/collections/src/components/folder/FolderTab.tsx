import { useMessages } from '@mandor/i18n';
import { useDeclaredList, useTab } from '@mandor/shell';
import { EmptyState, Tabs, TabsList, TabsPanel, TabsStrip, TabsTab } from '@mandor/ui';
import { useStore } from 'zustand';

import { collectionStore } from '../../collection-store.js';
import { folderSectionDeclarations } from '../../folder-section-declarations.js';
import { folderPartsOf } from '../../lib/folder-resource.js';
import { nodeAt } from '../../lib/node-at.js';

/**
 * The tab of a collection or a folder: one section per section the app declared, in their
 * order. The section in sight is the tab's own, kept in the store by the id of the tab; one the
 * app did not declare reads as the first. A group that is gone leaves the tab open and empty.
 */
export function FolderTab() {
    const messages = useMessages('collections');
    const { resource, tabId } = useTab();
    const parts = folderPartsOf(resource);
    const node = useStore(collectionStore, (state) =>
        parts === null ? null : nodeAt(state.nodes, parts.path),
    );
    const sections = useDeclaredList(folderSectionDeclarations);
    const chosen = useStore(collectionStore, (state) => state.folderSections[tabId]);

    if (node === null) {
        return <FolderTabEmpty description={messages('folderGone')} />;
    }

    const open = sections.find((section) => section.id === chosen)?.id ?? sections[0]?.id;

    if (open === undefined) {
        return <FolderTabEmpty description={messages('folderNoSections')} />;
    }

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col" data-part="folder-tab">
            <Tabs
                onValueChange={(id) => {
                    collectionStore.setState((state) => ({
                        folderSections: { ...state.folderSections, [tabId]: id },
                    }));
                }}
                value={open}
            >
                <TabsStrip>
                    <TabsList label={messages('folderSections')}>
                        {sections.map((section) => (
                            <TabsTab key={section.id} label={section.label} value={section.id} />
                        ))}
                    </TabsList>
                </TabsStrip>
                {sections.map((section) => (
                    <TabsPanel key={section.id} value={section.id}>
                        {section.body}
                    </TabsPanel>
                ))}
            </Tabs>
        </div>
    );
}

/** The tab with nothing to show: the group is gone, or the app declared no section. */
function FolderTabEmpty({ description }: { description: string }) {
    return (
        <div className="flex h-full min-h-0 flex-1 flex-col" data-part="folder-tab">
            <EmptyState description="" icon="folder" title={description} />
        </div>
    );
}
