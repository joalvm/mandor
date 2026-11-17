import { childPath, slugSchema } from '@mandor/schema';

import { holderOf } from './collection-level.js';
import { readOrder, writeOrder } from './collection-order.js';
import { assertFreeName } from './free-name.js';
import { orderWith } from './ordered-names.js';
import { RootItemError } from './root-item-error.js';
import { writeItem } from './write-item.js';

/**
 * What the caller chose before the item existed: the id it is filed under, the kind of its leaf
 * and the name a person reads. The id is main's to draw, or an import's to carry over.
 */
export type NewCollectionItem = {
    id: string;
    kind: string;
    name: string;
};

/**
 * Makes one item of a kind and answers with the path it took. The body is empty on purpose:
 * what a kind puts inside is of whoever registered that leaf, and the collection never writes it.
 */
export async function createCollectionItem(
    root: string,
    workspaceId: string,
    parent: string,
    item: NewCollectionItem,
): Promise<string> {
    const { kind, name } = item;

    const id = slugSchema.parse(item.id);
    const path = childPath(parent, id);

    if (holderOf(parent) === 'root') {
        throw new RootItemError(path);
    }

    await assertFreeName(root, workspaceId, path);
    await writeItem(root, workspaceId, path, { kind, name, tags: [], body: {} });

    const order = await readOrder(root, workspaceId, parent);

    await writeOrder(root, workspaceId, parent, orderWith(order, id));

    return path;
}
