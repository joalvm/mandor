import { TabBody, TabIndicator, TabKind, TabStatus } from '@mandor/shell';
import { Card } from '@mandor/ui';

import { COLLECTIONS_SECTION_ID } from './components/sidebar/CollectionsSection.js';
import { ItemTab } from './components/tab/ItemTab.js';
import { ItemTabMark } from './components/tab/ItemTabMark.js';
import { useTabItem } from './hooks/useTabItem.js';
import { ItemProvider } from './item-context.js';
import {
    isItemDirty,
    ITEM_TAB_KIND,
    releaseItem,
    saveItem,
    subscribeItemTitles,
} from './item-tab-kind.js';
import { itemTabTrail } from './lib/item-tab-trail.js';
import { itemTitle } from './lib/item-title.js';

/** What the kind of the item says at the end of its tab, or nothing. */
function ItemLeafStatus() {
    const { item, leaf, resource } = useTabItem();

    return <ItemProvider value={{ resource, saved: item?.mark }}>{leaf?.status}</ItemProvider>;
}

/**
 * The one tab kind the collection owns. What goes inside it belongs to whoever declared the kind
 * of the item, so one declaration serves every leaf an app ever adds.
 */
export function ItemTabKind() {
    return (
        <TabKind
            closable
            dirty={isItemDirty}
            icon="file"
            id={ITEM_TAB_KIND}
            release={releaseItem}
            save={saveItem}
            section={COLLECTIONS_SECTION_ID}
            subscribeTitles={subscribeItemTitles}
            title={itemTitle}
            trail={itemTabTrail}
        >
            <TabIndicator>
                <ItemTabMark />
            </TabIndicator>
            <TabBody>
                <Card>
                    <ItemTab />
                </Card>
            </TabBody>
            <TabStatus>
                <ItemLeafStatus />
            </TabStatus>
        </TabKind>
    );
}
