import { parseWith } from '../format/parse-with.js';
import type { CollectionItem } from './collection-item.js';
import { collectionItemEnvelopeSchema } from './collection-item-envelope-schema.js';

/** Reads one item file, splitting what the collection owns from what the kind owns. */
export function parseCollectionItem(input: unknown): CollectionItem {
    const { kind, name, tags, origin, ...body } = parseWith(collectionItemEnvelopeSchema, input);

    return { kind, name, tags: tags ?? [], origin, body };
}
