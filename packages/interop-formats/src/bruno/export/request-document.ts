import { concreteAuthOf, type FormatDocument } from '@mandor/interop-core';
import { parseRequestItem, type CollectionItem } from '@mandor/schema';

import { authEntryOf } from './auth-document.js';
import { bodyDocumentOf } from './body-document.js';
import { examplesDocumentOf } from './examples-document.js';
import { requestPartOf } from './request-part.js';
import { settingsDocumentOf } from './settings-document.js';

/** OpenCollection keeps examples only on an HTTP request. */
const EXAMPLES_OF: Record<string, typeof examplesDocumentOf> = {
    http: examplesDocumentOf,
    graphql: () => ({}),
};

/**
 * One request of the collection as the item Bruno lists: an HTTP request, or a GraphQL one when
 * the body is a query. A request that speaks no auth of its own inherits, which is what Bruno
 * calls `inherit`; one that stops the inheritance writes none. `seq` is where it stands among what
 * its folder holds: Bruno lists by this number.
 */
export function requestDocumentOf(item: CollectionItem, seq: number): FormatDocument {
    const request = parseRequestItem(item);
    const { kind, body } = bodyDocumentOf(request.body);
    const auth = concreteAuthOf(request.auth);

    return {
        info: {
            name: item.name,
            type: kind,
            seq,
            ...(item.tags.length === 0 ? {} : { tags: item.tags }),
        },
        [kind]: {
            ...requestPartOf(request),
            ...(body === undefined ? {} : { body }),
            ...authEntryOf(auth),
        },
        ...(request.description === undefined ? {} : { docs: request.description }),
        ...settingsDocumentOf(request.settings),
        ...EXAMPLES_OF[kind]?.(request),
    };
}
