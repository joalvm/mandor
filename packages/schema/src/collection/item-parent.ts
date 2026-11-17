import { collectionPlace } from './collection-place.js';

/**
 * The folder an item hangs from, which is where its chain starts: null when the item is saved
 * nowhere yet, or sits where nothing holds it. Both apps send from an item and ask this the same
 * way, so neither reads a path by hand.
 */
export function itemParentOf(itemPath: string | null): string | null {
    if (itemPath === null) {
        return null;
    }

    const { parent } = collectionPlace(itemPath);

    return parent === '' ? null : parent;
}
