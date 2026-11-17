import { originName, shellStore } from '@mandor/shell';

import { itemLeaf } from '../item-leaf-registry.js';
import { exampleResource } from './example-resource.js';
import { removeCollectionNodes } from './remove-collection-nodes.js';
import type { Doomed, DoomedExample } from './split-deleting.js';

/**
 * Takes out what the question before deleting was answered yes to. The examples go first, each
 * item's together with one write of the app, and the tabs that showed them are left open,
 * pointing at nothing; then the nodes, which read the tree again once at the end.
 */
export async function removeDoomedRows(workspaceId: string, doomed: Doomed): Promise<void> {
    const origin = originName();

    for (const [item, examples] of groupByItem(doomed.examples)) {
        const resources = examples.map(({ example }) =>
            exampleResource(origin, workspaceId, item.path, example.key),
        );

        await itemLeaf(item.itemKind)?.examples?.remove(resources);

        for (const resource of resources) {
            shellStore.getState().removeResource(resource);
        }
    }

    await removeCollectionNodes(workspaceId, doomed.nodes);
}

function groupByItem(
    examples: readonly DoomedExample[],
): Map<DoomedExample['item'], DoomedExample[]> {
    const byItem = new Map<DoomedExample['item'], DoomedExample[]>();

    for (const doomed of examples) {
        byItem.set(doomed.item, [...(byItem.get(doomed.item) ?? []), doomed]);
    }

    return byItem;
}
