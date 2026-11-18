import { collectionStore } from '../collection-store.js';
import type { CollectionRow } from './collection-rows.js';

type Expand = (workspaceId: string, path: string, expanded: boolean) => void;

/**
 * What opening or closing a line does, by the kind of node on it: a collection and a folder show
 * or hide what they hold, an item its examples. The line of an example holds nothing.
 */
const EXPAND_OF_KIND: Record<CollectionRow['node']['kind'], Expand> = {
    collection: (workspaceId, path, expanded) => {
        collectionStore.getState().fold(workspaceId, path, !expanded);
    },
    folder: (workspaceId, path, expanded) => {
        collectionStore.getState().fold(workspaceId, path, !expanded);
    },
    item: (workspaceId, path, expanded) => {
        collectionStore.getState().openExamples(workspaceId, path, expanded);
    },
};

/** The chevron of a line was pressed, or its arrow key: open or close what the line holds. */
export function expandCollectionRow(
    workspaceId: string,
    rows: readonly CollectionRow[],
    id: string,
    expanded: boolean,
): void {
    const row = rows.find((line) => line.id === id);

    if (row === undefined || row.example !== undefined) {
        return;
    }

    EXPAND_OF_KIND[row.node.kind](workspaceId, row.node.path, expanded);
}
