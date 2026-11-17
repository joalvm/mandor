import { selectConflictFor, selectResourceOfTab, useShellStore } from '@mandor/shell';

import { itemPartsOf } from '../../lib/item-resource.js';
import { ConflictMark } from '../sidebar/ConflictMark.js';

type ItemConflictMarkProps = { tabId: string };

/**
 * The mark of a tab on an item whose changes clash, the same one its row wears in the tree. The
 * tab is found by its id, since the strip knows no resource, and the clash by the item it shows;
 * it goes as soon as the clash is answered.
 */
export function ItemConflictMark({ tabId }: ItemConflictMarkProps) {
    const clash = useShellStore((state) => {
        const resource = selectResourceOfTab(state, tabId);
        const parts = resource === null ? null : itemPartsOf(resource);

        return parts === null
            ? undefined
            : selectConflictFor(state, { area: 'collections', ...parts });
    });

    if (clash === undefined) {
        return null;
    }

    return <ConflictMark />;
}
