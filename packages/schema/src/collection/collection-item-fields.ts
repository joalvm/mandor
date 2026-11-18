import type { CollectionItem } from './collection-item.js';
import type { CollectionItemFields } from './collection-item-envelope-schema.js';

/**
 * The flat record one item writes: envelope first, then the keys of its kind at the same level.
 * A body nested under a key of its own would be a format only Mandor could read.
 *
 * Tags and origin are left out when there are none. An empty list in the file reads as a
 * decision somebody made, and nobody made it.
 */
export function collectionItemFields(item: CollectionItem): CollectionItemFields {
    return {
        kind: item.kind,
        name: item.name,
        ...(item.tags.length === 0 ? {} : { tags: item.tags }),
        ...(item.origin === undefined ? {} : { origin: item.origin }),
        ...item.body,
    };
}
