import {
    COLLECTION_DEFINITION_FILE,
    COLLECTION_EXTENSION,
    COLLECTIONS_FILE,
    FOLDER_FILE,
} from './collection-path.js';
import { levelOf, type CollectionLevel } from './collection-level.js';

/** What a file of the collection directory holds, by the path the tree knows it under. */
export type CollectionFilePlace = { kind: 'folder' | 'item'; path: string };

/** The name of the file that keeps the settings of a group, by the level of the group. */
const SETTINGS_FILE: Record<CollectionLevel, string> = {
    collection: COLLECTION_DEFINITION_FILE,
    folder: FOLDER_FILE,
};

const RESERVED = new Set<string>(Object.values(SETTINGS_FILE));

/**
 * What a file names, from its path under the collection directory with `/` between segments: the
 * settings of the group it sits in when its name is the one of that level, an item otherwise. The
 * root file, a settings name at the wrong level and any file that is not YAML name nothing.
 */
export function collectionFilePlace(path: string): CollectionFilePlace | null {
    const cut = path.lastIndexOf('/');
    const group = path.slice(0, Math.max(cut, 0));
    const name = path.slice(cut + 1);

    if (group !== '' && SETTINGS_FILE[levelOf(group)] === name) {
        return { kind: 'folder', path: group };
    }

    if (group === '' && name === COLLECTIONS_FILE) {
        return null;
    }

    if (RESERVED.has(name) || !name.endsWith(COLLECTION_EXTENSION)) {
        return null;
    }

    return { kind: 'item', path: path.slice(0, -COLLECTION_EXTENSION.length) };
}
