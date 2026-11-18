import { use } from 'react';

import { ItemProvider, type ItemContextValue } from '../item-context.js';

/** The item the part being drawn belongs to. Read only inside a row or a tab of an item. */
export function useItem(): ItemContextValue {
    const item = use(ItemProvider);

    if (item === null) {
        throw new Error('useItem is only read inside an item: its row or its tab draws it.');
    }

    return item;
}
