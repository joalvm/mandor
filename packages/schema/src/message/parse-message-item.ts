import type { CollectionItem } from '../collection/collection-item.js';
import { parseWith } from '../format/parse-with.js';
import type { MessageItem } from './message-item.js';
import { messageItemSchema } from './message-item-schema.js';

/**
 * Reads the message inside one item of the collection. The tree carried the envelope and never
 * looked at the body; this is where the body becomes a message, and only in the app that has one.
 */
export function parseMessageItem(item: CollectionItem): MessageItem {
    return parseWith(messageItemSchema, { ...item.body, name: item.name });
}
