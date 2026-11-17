import type { RowActivation } from '@mandor/ui';

import { collectionStore } from '../collection-store.js';
import type { CollectionRow } from './collection-rows.js';
import { isGroup } from './group-nodes.js';
import { openExampleRow } from './open-example-row.js';
import { openItem } from './open-item.js';

/**
 * A plain press on a line: a folder opens or closes, an item opens its tab, and so does an
 * example, if the app declared how. A single click only looks at it; a double click or Enter
 * keeps its tab.
 */
export function activateCollectionRow(
    workspaceId: string,
    rows: readonly CollectionRow[],
    id: string,
    activation: RowActivation,
): void {
    const row = rows.find((line) => line.id === id);

    if (row === undefined) {
        return;
    }

    if (row.example !== undefined && !isGroup(row.node)) {
        openExampleRow(workspaceId, row.node, row.example, {
            beside: false,
            preview: !activation.keep,
        });

        return;
    }

    if (isGroup(row.node)) {
        collectionStore.getState().fold(workspaceId, row.node.path, row.expanded === true);

        return;
    }

    openItem(workspaceId, row.node.path, {
        itemKind: row.node.itemKind,
        preview: !activation.keep,
    });
}
