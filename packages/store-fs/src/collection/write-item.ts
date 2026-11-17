import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

import type { CollectionItem } from '@mandor/schema';

import { atomicWrite } from '../disk/atomic-write.js';
import { orRefusal } from '../disk/or-refusal.js';
import { readTextOrNull } from '../disk/read-text.js';
import { itemFile } from './collection-path.js';
import { itemTextWith } from './item-text-with.js';

/**
 * Writes one item to the file its path names, edited inside its own document when it was already
 * there (see `itemTextWith`). A file that exists and is not an item is a refusal, never a file
 * to overwrite.
 */
export async function writeItem(
    root: string,
    workspaceId: string,
    path: string,
    item: CollectionItem,
): Promise<void> {
    const file = itemFile(root, workspaceId, path);
    const text = await readTextOrNull(file);
    const next =
        text === null ? itemTextWith(null, item) : orRefusal(file, () => itemTextWith(text, item));

    await mkdir(dirname(file), { recursive: true });
    await atomicWrite(file, next);
}
