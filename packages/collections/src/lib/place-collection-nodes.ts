import { childPath, type CollectionNode, collectionPlace } from '@mandor/schema';

import { bridge, settlePendingWrites } from '@mandor/shell';
import { collectionStore } from '../collection-store.js';

import type { CollectionSpot } from './collection-spot.js';
import { loadCollection } from './load-collection.js';
import { moveItemTabs } from './move-item-tabs.js';

/** Where a node was, and where it is now. */
type Moved = { from: string; to: string };

/**
 * Puts nodes where a drag or a keypress left them, one after another in the same spot, so they
 * land together and in the order they had. The first refusal stops the rest, and the tree is read
 * again either way, so it shows exactly what moved and what stayed.
 */
export async function placeCollectionNodes(
    workspaceId: string,
    nodes: readonly CollectionNode[],
    spot: CollectionSpot,
): Promise<void> {
    const moved: Moved[] = [];

    for (const node of nodes) {
        const to = await placeCollectionNode(workspaceId, node, spot);

        if (to === null) {
            break;
        }

        moved.push({ from: node.path, to });
    }

    followSelection(moved);
    await loadCollection(workspaceId);
}

/**
 * Staying among the same siblings is an order and nothing else, so it goes through the channel
 * that writes one file; changing folder carries the node and settles where it lands in the same
 * call, never in a second one. Answers the path the node landed on, or `null` when refused.
 */
async function placeCollectionNode(
    workspaceId: string,
    node: CollectionNode,
    spot: CollectionSpot,
): Promise<string | null> {
    const { parent, name } = collectionPlace(node.path);
    const { before } = spot;
    const to = childPath(spot.parent, name);

    // What a tab of a folder typed reaches its file on the path it had, before the path changes.
    await settlePendingWrites();

    const result =
        parent === spot.parent
            ? await bridge.collections.reorder({ workspaceId, parent, name, before })
            : await bridge.collections.move({
                  workspaceId,
                  from: node.path,
                  kind: node.kind,
                  to,
                  before,
              });

    if (!result.ok) {
        collectionStore.getState().setError(result.error.code);

        return null;
    }

    if (to !== node.path) {
        moveItemTabs(workspaceId, node, to);
    }

    return to;
}

/**
 * Taken before the move, taken after it: whatever sat at or under a path that moved follows it.
 * It happens before the tree is read again, which lets go of every path the new tree lacks.
 */
function followSelection(moved: readonly Moved[]): void {
    const { selected, setSelected } = collectionStore.getState();

    setSelected(selected.map((path) => movedPath(path, moved)));
}

function movedPath(path: string, moved: readonly Moved[]): string {
    const move = moved.find(({ from }) => path === from || path.startsWith(`${from}/`));

    return move === undefined ? path : `${move.to}${path.slice(move.from.length)}`;
}
