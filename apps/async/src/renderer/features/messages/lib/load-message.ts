import { itemPartsOf } from '@mandor/collections';
import type { ErrorCode } from '@mandor/ipc';
import { parseCollectionItem, parseMessageItem, type MessageItem } from '@mandor/schema';

import { asyncBridge } from '../../../app/async-bridge.js';
import { messagesStore } from '../messages-store.js';

/** A body Mandor cannot read is a file fault, not a crash: the tab says so and stays open. */
export function messageOf(fields: unknown): MessageItem | null {
    try {
        return parseMessageItem(parseCollectionItem(fields));
    } catch {
        return null;
    }
}

/**
 * Brings one item off disk, once. The guard is taken before the first await, so the second view
 * of the same item finds the read already in flight and waits for the answer of the first.
 */
export async function loadMessage(resource: string): Promise<ErrorCode | null> {
    const parts = itemPartsOf(resource);
    const state = messagesStore.getState();

    if (parts === null || state.messages[resource] !== undefined) {
        return null;
    }

    if (state.reading.includes(resource)) {
        return null;
    }

    state.beginRead(resource);

    const result = await asyncBridge.collections.readItem({
        path: parts.path,
        workspaceId: parts.workspaceId,
    });

    if (!result.ok) {
        messagesStore.getState().finishRead(resource, null);

        return result.error.code;
    }

    const message = messageOf(result.value);

    messagesStore.getState().finishRead(resource, message);

    return message === null ? 'fs-read' : null;
}
