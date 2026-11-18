import { itemPartsOf } from '@mandor/collections';

import { asyncBridge } from '../../../app/async-bridge.js';
import { messagesStore } from '../messages-store.js';

import { messageOf } from './load-message.js';
import { flushPendingMessageWrite } from './pending-message-write.js';

/**
 * Reads one item again because its file changed on disk without the window. What was typed goes
 * to main first, so the read never erases it. An item that cannot be read keeps what the
 * window already shows: the next change of the file will say more than a half-written one.
 */
export async function reloadMessage(resource: string): Promise<void> {
    const parts = itemPartsOf(resource);

    if (parts === null) {
        return;
    }

    await flushPendingMessageWrite(resource);

    const result = await asyncBridge.collections.readItem({
        path: parts.path,
        workspaceId: parts.workspaceId,
    });

    if (!result.ok) {
        return;
    }

    const message = messageOf(result.value);

    if (message !== null) {
        messagesStore.getState().setMessage(resource, message);
    }
}
