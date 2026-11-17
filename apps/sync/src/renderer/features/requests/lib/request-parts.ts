import { itemPartsOf } from '@mandor/collections';
import type { ResourceUri } from '@mandor/schema';

import { loosePartsOf } from './loose-resource.js';

/** Where a request lives: its workspace, and its path in the collection while it has one. */
export type RequestParts = { path: string | null; workspaceId: string };

/**
 * The parts of a request, saved or not. One saved nowhere still belongs to a workspace — its
 * environment, its variables, its history — and only lacks the path a collection would give it.
 */
export function requestPartsOf(resource: ResourceUri): RequestParts | null {
    const item = itemPartsOf(resource);

    if (item !== null) {
        return item;
    }

    const loose = loosePartsOf(resource);

    return loose === null ? null : { path: null, workspaceId: loose.workspaceId };
}
