import { createContext } from 'react';

/** The item a drawn part belongs to: its row, its tab, its mark. */
export type ItemContextValue = {
    resource: string;
    /** What the tree read off the file for the item's mark, before any window opened it. */
    saved: string | undefined;
};

/** Given by whoever draws a part of an item: the row of the tree, the tab, a test. */
export const ItemProvider = createContext<ItemContextValue | null>(null);

/** The kind whose parts are being declared, given by `ItemKind` to its parts. */
export const ItemKindIdContext = createContext<string | null>(null);
