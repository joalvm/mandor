import { itemNameOf, itemPartsOf } from '@mandor/collections';
import type { ErrorCode } from '@mandor/ipc';
import { MESSAGE_ITEM_KIND, messageItemBody, type MessageItem } from '@mandor/schema';
import { createPendingWrites } from '@mandor/shell';

import { asyncBridge } from '../../../app/async-bridge.js';
import { messagesStore } from '../messages-store.js';

type MessageWrite = {
    message: MessageItem;
    before: MessageItem | undefined;
    onError: (code: ErrorCode) => void;
};

const PENDING = createPendingWrites<string, MessageWrite>(writeNow);

/**
 * Puts an edited message on disk once the typing stops. There is no dirty mark, no save button
 * and no question on the way out, because every change is already on its way to the file.
 */
export function scheduleMessageWrite(
    resource: string,
    message: MessageItem,
    onError: (code: ErrorCode) => void,
): void {
    // What a refusal goes back to is what the file holds: the edit before the last one, still
    // waiting with it, never reached the disk.
    const before = PENDING.waiting(resource)?.before ?? messagesStore.getState().messages[resource];

    messagesStore.getState().setMessage(resource, message);
    PENDING.schedule(resource, { message, before, onError });
}

/** Sends the write still waiting for the typing to stop now: the file is about to be read again. */
export function flushPendingMessageWrite(resource: string): Promise<void> {
    return PENDING.flush(resource);
}

/** A refusal puts the item back as it was and hands the code over to be told as a toast. */
async function writeNow(
    resource: string,
    { message, before, onError }: MessageWrite,
): Promise<void> {
    const parts = itemPartsOf(resource);

    if (parts === null) {
        return;
    }

    const result = await asyncBridge.collections.writeItem({
        fields: {
            kind: MESSAGE_ITEM_KIND,
            name: itemNameOf(resource, message.name),
            ...messageItemBody(message),
        },
        path: parts.path,
        workspaceId: parts.workspaceId,
    });

    if (result.ok) {
        return;
    }

    if (before !== undefined) {
        messagesStore.getState().setMessage(resource, before);
    }

    onError(result.error.code);
}
