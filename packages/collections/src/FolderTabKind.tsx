import { TabBody, TabKind } from '@mandor/shell';
import { Card } from '@mandor/ui';

import { COLLECTIONS_SECTION_ID } from './components/sidebar/CollectionsSection.js';
import { FolderTab } from './components/folder/FolderTab.js';
import { FOLDER_TAB_KIND } from './folder-section-declarations.js';
import { subscribeItemTitles } from './item-tab-kind.js';
import { folderTitle } from './lib/folder-title.js';

/**
 * The tab of a collection or a folder, in both apps. It has nothing to save: what its sections
 * edit is written as it is typed, so it is never dirty and closes like any tab.
 */
export function FolderTabKind() {
    return (
        <TabKind
            closable
            icon="folder"
            id={FOLDER_TAB_KIND}
            section={COLLECTIONS_SECTION_ID}
            subscribeTitles={subscribeItemTitles}
            title={folderTitle}
        >
            <TabBody>
                <Card>
                    <FolderTab />
                </Card>
            </TabBody>
        </TabKind>
    );
}
