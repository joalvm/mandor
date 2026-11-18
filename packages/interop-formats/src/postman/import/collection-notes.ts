import { degradation, type Degradation, isRecord } from '@mandor/interop-core';

import type { PostmanCollection, PostmanItem } from '../document/postman-collection-schema.js';
import { extrasOf } from './extras-of.js';

const ROOT_CONSUMED = ['info', 'item', 'auth', 'event', 'variable'];

/**
 * What the import leaves behind in a collection, one sentence each and each once: the
 * descriptions of parameters, headers and variables, and every key of the root nothing reads.
 */
export function notesOf(collection: PostmanCollection): Degradation[] {
    const items = allItems(collection.item);
    const notes: Degradation[] = [];

    if ([...(collection.variable ?? []), ...items.flatMap(rowsOf)].some(describes)) {
        notes.push(degradation('descriptionsNotKept'));
    }

    for (const key of Object.keys(extrasOf(collection, ROOT_CONSUMED))) {
        notes.push(degradation('collectionKeyNotImported', { key }));
    }

    return notes;
}

function allItems(items: readonly PostmanItem[]): PostmanItem[] {
    return items.flatMap((item) => [item, ...allItems(item.item ?? [])]);
}

function rowsOf(item: PostmanItem): unknown[] {
    const request = item.request;
    const url = request?.url;

    return [
        ...described(item.variable),
        ...described(pick(request, 'header')),
        ...described(pick(url, 'query')),
        ...described(pick(url, 'variable')),
    ];
}

/** A key of a request or an url, which come in two shapes (written as text, or as an object). */
function pick(source: object | null | undefined, key: string): unknown {
    return isRecord(source) ? source[key] : undefined;
}

/** The rows of a list; a request can write its headers as one text, and a text has none. */
function described(rows: unknown): unknown[] {
    return Array.isArray(rows) ? rows : [];
}

function describes(row: unknown): boolean {
    return isRecord(row) && row['description'] !== undefined && row['description'] !== null;
}
