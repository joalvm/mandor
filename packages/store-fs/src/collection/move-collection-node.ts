import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

import { type CollectionNode, collectionPlace, type CollectionPlace } from '@mandor/schema';

import { fileExists } from '../disk/file-exists.js';
import { renameWithRetry } from '../disk/rename-with-retry.js';
import { fileOfLevel, holderOf, levelOf } from './collection-level.js';
import { folderDir, itemFile } from './collection-path.js';
import { readOrder, writeOrder } from './collection-order.js';
import { assertFreeName } from './free-name.js';
import { orderPlacing, orderRenaming, orderWithout } from './ordered-names.js';
import { RootItemError } from './root-item-error.js';

/** What travels for each kind of node: a whole directory for a group, one file for an item. */
const PLACES = { collection: folderDir, folder: folderDir, item: itemFile } as const;

/** Which path stops being the node's, which one starts, and what the node is on disk. */
export type CollectionMove = {
    /**
     * The sibling it lands above where it arrives. Nothing at all sends it to the end, which
     * is where a rename never gets to look: those keep the position they already had.
     */
    before?: string | null;
    from: string;
    kind: CollectionNode['kind'];
    to: string;
};

/**
 * Moves or renames one node, which are the same operation: the path is the identity, so both
 * end with it somewhere else. What travels is a file for an item and a whole directory for a
 * folder, and the order files follow, because disk is the truth about what exists and an order
 * that lost a step costs a position, never a node. A taken name is refused before any write.
 */
export async function moveCollectionNode(
    root: string,
    workspaceId: string,
    move: CollectionMove,
): Promise<void> {
    const source = collectionPlace(move.from);
    const target = collectionPlace(move.to);
    const place = PLACES[move.kind];

    // The top level holds collections: an item has no file there, and whatever stands at the
    // top is a collection, so it has no place inside a folder — whatever the move calls it.
    // The refusal comes before any write, like a taken name does.
    const entersRoot = move.kind === 'item' && holderOf(target.parent) === 'root';
    const entersFolder = holderOf(source.parent) === 'root' && holderOf(target.parent) !== 'root';

    if (entersRoot || entersFolder) {
        throw new RootItemError(move.to);
    }

    await assertFreeName(root, workspaceId, move.to);

    const arrival = place(root, workspaceId, move.to);

    await mkdir(dirname(arrival), { recursive: true });
    await renameWithRetry(place(root, workspaceId, move.from), arrival);
    await redefineLevel(root, workspaceId, move);
    await moveOrders(root, workspaceId, move, { source, target });
}

type Places = { source: CollectionPlace; target: CollectionPlace };

/**
 * A group that changes level changes the name of its file: the collection keeps its settings in
 * `collection.yaml` and a folder in `folder.yaml`, and the two hold the same shape. So the file
 * moves with its text, and everything in it — what this version knows and what it does not —
 * arrives as it was written. A group that never had a file has nothing to move.
 */
async function redefineLevel(
    root: string,
    workspaceId: string,
    move: CollectionMove,
): Promise<void> {
    const from = levelOf(move.from);
    const to = levelOf(move.to);

    if (move.kind === 'item' || from === to) {
        return;
    }

    const file = fileOfLevel(from, root, workspaceId, move.to);

    if (await fileExists(file)) {
        await renameWithRetry(file, fileOfLevel(to, root, workspaceId, move.to));
    }
}

/**
 * One write when the node stayed among the same siblings, two when it changed folder. Where it
 * lands is settled here and not by a second call, so the diff of a move is one line per order.
 */
async function moveOrders(
    root: string,
    workspaceId: string,
    move: CollectionMove,
    { source, target }: Places,
): Promise<void> {
    if (source.parent === target.parent) {
        const order = await readOrder(root, workspaceId, source.parent);

        await writeOrder(
            root,
            workspaceId,
            source.parent,
            orderRenaming(order, source.name, target.name),
        );

        return;
    }

    await writeOrder(
        root,
        workspaceId,
        source.parent,
        orderWithout(await readOrder(root, workspaceId, source.parent), source.name),
    );
    await writeOrder(
        root,
        workspaceId,
        target.parent,
        orderPlacing(await readOrder(root, workspaceId, target.parent), {
            name: target.name,
            before: move.before ?? null,
        }),
    );
}
