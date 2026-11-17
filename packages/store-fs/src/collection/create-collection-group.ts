import { childPath, slugSchema } from '@mandor/schema';

import { readOrder, writeOrder } from './collection-order.js';
import { writeFolderSettings } from './write-folder-settings.js';
import { assertFreeName } from './free-name.js';
import { orderWith } from './ordered-names.js';

/**
 * What the caller chose before the group existed: the id it is filed under, which main draws or
 * an import already read, and the name a person reads. An id already taken is refused before
 * anything is written.
 */
export type NewCollectionGroup = {
    id: string;
    name: string;
};

/**
 * Makes an empty group under `parent` and answers with the path it took. A collection and a
 * folder are made the same way: the level of the path picks the file, and the parent's order
 * lists the newcomer last. The name is data inside the file and the id is the identity, so
 * renaming never moves what a tab or a link already points at.
 */
export async function createCollectionGroup(
    root: string,
    workspaceId: string,
    parent: string,
    group: NewCollectionGroup,
): Promise<string> {
    const id = slugSchema.parse(group.id);
    const path = childPath(parent, id);

    await assertFreeName(root, workspaceId, path);
    await writeFolderSettings(root, workspaceId, path, { name: group.name, order: [] });

    const order = await readOrder(root, workspaceId, parent);

    await writeOrder(root, workspaceId, parent, orderWith(order, id));

    return path;
}
