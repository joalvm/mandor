import { use } from 'react';

import {
    CollectionRowProvider,
    type CollectionRowContextValue,
} from '../collection-row-context.js';

/** The row the line being drawn belongs to. Read only inside the menu of a row. */
export function useCollectionRow(): CollectionRowContextValue {
    const row = use(CollectionRowProvider);

    if (row === null) {
        throw new Error('useCollectionRow is only read inside the menu of a row.');
    }

    return row;
}
