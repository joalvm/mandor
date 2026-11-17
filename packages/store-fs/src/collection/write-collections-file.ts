import { mkdir } from 'node:fs/promises';

import { type CollectionsFile, parseCollectionsFile } from '@mandor/schema';

import { documentOf } from '../disk/document-of.js';
import { fileExists } from '../disk/file-exists.js';
import { FileReadError } from '../disk/file-read-error.js';
import { readDocument } from '../disk/read-document.js';
import { writeDocument } from '../disk/write-document.js';
import { collectionDir, collectionsFile } from './collection-path.js';

/** The root of the collection: the order of what hangs from it, and where the whole tree came from. */
export async function writeCollectionsFile(
    root: string,
    workspaceId: string,
    collection: CollectionsFile,
): Promise<void> {
    const valid = parseCollectionsFile(collection);
    const fields = { order: valid.order, ...(valid.origin && { origin: valid.origin }) };
    const file = collectionsFile(root, workspaceId);
    const existing = await readDocument(file, parseCollectionsFile);

    if (existing.ok) {
        await writeDocument(file, existing.document, fields);

        return;
    }

    if (await fileExists(file)) {
        throw new FileReadError(existing.warning);
    }

    await mkdir(collectionDir(root, workspaceId), { recursive: true });
    await writeDocument(file, documentOf(fields), {});
}
