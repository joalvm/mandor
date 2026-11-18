import { readItem } from './read-item.js';
import { writeItem } from './write-item.js';

/**
 * Renames one item: the `name` inside the file is what a person reads, and the file keeps the
 * id it was born with. Nothing moves, so a tab or a link that points at the item still does.
 */
export async function renameItem(
    root: string,
    workspaceId: string,
    path: string,
    name: string,
): Promise<void> {
    const item = await readItem(root, workspaceId, path);

    await writeItem(root, workspaceId, path, { ...item, name });
}
