import type { Dirent } from 'node:fs';

import { SEGMENT } from '@mandor/schema';

import { entriesOrNone } from '../disk/directory-entries.js';
import {
    COLLECTION_DEFINITION_FILE,
    COLLECTION_EXTENSION,
    COLLECTIONS_FILE,
    FOLDER_FILE,
} from './collection-path.js';

export type CollectionEntries = {
    folders: string[];
    items: string[];
};

const RESERVED = [COLLECTIONS_FILE, COLLECTION_DEFINITION_FILE, FOLDER_FILE];

/**
 * What one directory of the collection holds, by name and without extension. Anything the domain
 * would refuse to name is left out here and not at the click: a name that cannot become a path
 * id cannot become a resource either, so listing it would only offer something that fails.
 */
export async function collectionEntries(dir: string): Promise<CollectionEntries> {
    const entries = await entriesOrNone(dir);

    return {
        folders: entries.filter(isFolder).map((entry) => entry.name),
        items: entries.filter(isItem).map(itemName),
    };
}

function isFolder(entry: Dirent): boolean {
    return entry.isDirectory() && SEGMENT.test(entry.name);
}

function isItem(entry: Dirent): boolean {
    if (!entry.isFile() || RESERVED.includes(entry.name)) {
        return false;
    }

    return entry.name.endsWith(COLLECTION_EXTENSION) && SEGMENT.test(itemName(entry));
}

function itemName(entry: Dirent): string {
    return entry.name.slice(0, -COLLECTION_EXTENSION.length);
}
