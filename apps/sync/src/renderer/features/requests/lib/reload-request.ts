import { itemPartsOf } from '@mandor/collections';
import { bridge } from '@mandor/shell';

import { requestsStore } from '../requests-store.js';

import { requestOf } from './load-request.js';

/**
 * Reads one item again because its file changed on disk without the window. A draft the person
 * has not saved yet is not the reader's to erase: while it stands, the window keeps showing it
 * and the file waits for the next save to take the draft in. An item that cannot be read keeps
 * what the window already shows: the next change of the file will say more than a half-written
 * one.
 */
export async function reloadRequest(resource: string): Promise<void> {
    const parts = itemPartsOf(resource);

    if (parts === null) {
        return;
    }

    if (requestsStore.getState().pendings[resource] !== undefined) {
        return;
    }

    const result = await bridge.collections.readItem({
        path: parts.path,
        workspaceId: parts.workspaceId,
    });

    if (!result.ok) {
        return;
    }

    const request = requestOf(result.value);

    if (request !== null) {
        requestsStore.getState().setRequest(resource, request);
    }
}
