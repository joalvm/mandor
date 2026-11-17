import { useTab } from '@mandor/shell';

import { useTabItem } from '../../hooks/useTabItem.js';
import { ItemProvider } from '../../item-context.js';
import { ItemConflictMark } from './ItemConflictMark.js';

/**
 * What a tab on an item wears before its title: the mark its kind gives it, the same one its row
 * wears in the tree, and the clash mark while its changes clash. A kind with no mark wears none,
 * since the strip draws no glyph for a tab.
 */
export function ItemTabMark() {
    const { tabId } = useTab();
    const { item, leaf, resource } = useTabItem();

    return (
        <>
            <ItemProvider value={{ resource, saved: item?.mark }}>{leaf?.mark}</ItemProvider>
            <ItemConflictMark tabId={tabId} />
        </>
    );
}
