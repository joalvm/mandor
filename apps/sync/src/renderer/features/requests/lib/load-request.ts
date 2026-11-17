import { itemPartsOf } from '@mandor/collections';
import type { ErrorCode } from '@mandor/ipc';
import { parseCollectionItem, parseRequestItem, type RequestItem } from '@mandor/schema';
import { bridge } from '@mandor/shell';

import { requestsStore } from '../requests-store.js';

/** A body Mandor cannot read is a file fault, not a crash: the tab says so and stays open. */
export function requestOf(fields: unknown): RequestItem | null {
    try {
        return parseRequestItem(parseCollectionItem(fields));
    } catch {
        return null;
    }
}

/**
 * Brings one item off disk, once. The guard is taken before the first await, so the second view
 * of the same item finds the read already in flight and waits for the answer of the first.
 */
export async function loadRequest(resource: string): Promise<ErrorCode | null> {
    const parts = itemPartsOf(resource);
    const state = requestsStore.getState();

    if (parts === null || state.requests[resource] !== undefined) {
        return null;
    }

    if (state.reading.includes(resource)) {
        return null;
    }

    state.beginRead(resource);

    const result = await bridge.collections.readItem({
        path: parts.path,
        workspaceId: parts.workspaceId,
    });

    if (!result.ok) {
        requestsStore.getState().finishRead(resource, null);

        return result.error.code;
    }

    const request = requestOf(result.value);

    requestsStore.getState().finishRead(resource, request);

    return request === null ? 'fs-read' : null;
}
