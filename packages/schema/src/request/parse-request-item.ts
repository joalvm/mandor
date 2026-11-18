import type { CollectionItem } from '../collection/collection-item.js';
import { parseWith } from '../format/parse-with.js';
import type { RequestItem } from './request-item.js';
import { requestItemSchema } from './request-item-schema.js';

/**
 * Reads the request inside one item of the collection. The tree carried the envelope and never
 * looked at the body; this is where the body becomes a request, and only in the app that has one.
 */
export function parseRequestItem(item: CollectionItem): RequestItem {
    return parseWith(requestItemSchema, { ...item.body, name: item.name });
}
