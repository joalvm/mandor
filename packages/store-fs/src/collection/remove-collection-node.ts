import { rm } from 'node:fs/promises';
import { collectionPlace } from '@mandor/schema';

import { readOrder, writeOrder } from './collection-order.js';
import { folderDir, itemFile } from './collection-path.js';
import { orderWithout } from './ordered-names.js';

/**
 * Removes a folder with everything under it, or one item, and takes the name out of the order
 * that held it. There is no bin: what brings work back is the history of the origin, which the
 * user never sees and git always keeps. Both paths are tried because a name is one row on
 * screen, and the row never says which of the two shapes disk gave it.
 */
export async function removeCollectionNode(
    root: string,
    workspaceId: string,
    path: string,
): Promise<void> {
    const place = collectionPlace(path);

    await rm(itemFile(root, workspaceId, path), { force: true });
    await rm(folderDir(root, workspaceId, path), { force: true, recursive: true });

    const order = await readOrder(root, workspaceId, place.parent);

    await writeOrder(root, workspaceId, place.parent, orderWithout(order, place.name));
}
