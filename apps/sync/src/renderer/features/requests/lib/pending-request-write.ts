import { itemNameOf, itemPartsOf } from '@mandor/collections';
import type { ErrorCode } from '@mandor/ipc';
import { REQUEST_ITEM_KIND, requestItemBody, type RequestItem } from '@mandor/schema';
import { bridge } from '@mandor/shell';

import { requestsStore } from '../requests-store.js';

/**
 * Sync keeps the draft in the window and puts it on disk when the person says so: Ctrl+S, the
 * way a request is saved. What was typed and is not on the file yet — the draft — is what the
 * tab of the request reads as dirty, and an edit that goes back to what the file holds lets
 * the draft go: volver no es cambiar.
 */
export function editRequest(resource: string, request: RequestItem): void {
    const state = requestsStore.getState();
    const before = state.pendings[resource]?.before ?? state.requests[resource];

    state.setRequest(resource, request);

    // An edit that lands back on what the file holds is no edit at all: the draft lets go, and
    // the tab stops saying there is something to save.
    if (JSON.stringify(request) === JSON.stringify(before)) {
        state.clearPending(resource);

        return;
    }

    state.setPending(resource, { before, request });
}

/**
 * The examples, and the schemas of their answers, are written by their own tabs, so a request
 * draft cut from an older read must not carry them back: an absent key leaves what the file
 * holds untouched.
 */
function withoutExampleParts(body: ReturnType<typeof requestItemBody>): Record<string, unknown> {
    return Object.fromEntries(Object.entries(body).filter(([key]) => key !== 'examples'));
}

/**
 * Puts the draft on disk and lets go of it. A request with no draft has nothing to save and
 * answers without touching anything. A refusal keeps the draft —the tab still says there is
 * something to save, and nothing typed is lost— and answers the code, for whoever saved to tell
 * it as a toast.
 */
export async function saveRequest(resource: string): Promise<ErrorCode | null> {
    const pending = requestsStore.getState().pendings[resource];

    if (pending === undefined) {
        return null;
    }

    requestsStore.getState().clearPending(resource);

    const parts = itemPartsOf(resource);

    if (parts === null) {
        return null;
    }

    const result = await bridge.collections.writeItem({
        fields: {
            kind: REQUEST_ITEM_KIND,
            name: itemNameOf(resource, pending.request.name),
            ...withoutExampleParts(requestItemBody(pending.request)),
        },
        path: parts.path,
        workspaceId: parts.workspaceId,
    });

    if (result.ok) {
        return null;
    }

    requestsStore.getState().setPending(resource, pending);

    return result.error.code;
}
