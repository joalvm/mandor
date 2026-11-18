import { itemPartsOf } from '@mandor/collections';
import type { ErrorCode } from '@mandor/ipc';

import { asyncBridge } from '../app/async-bridge.js';
import { composerEventsStore } from './composer-events-store.js';

/**
 * Puts the payload the composer holds back into the event it came from, and leaves everything
 * else of the file exactly as it is. An event that is not being composed, or one whose text
 * already matches the file, is not written: a save without a change is a no-op, not a write.
 */
export async function saveEventInComposer(connectionId: string): Promise<ErrorCode | null> {
    const event = composerEventsStore.getState().byConnection[connectionId];

    // Free text has no file behind it: a save with nobody to save is not an error.
    if (event === undefined || !event.dirty || event.eventResource === '') {
        return null;
    }

    const parts = itemPartsOf(event.eventResource);

    if (parts === null) {
        return 'fs-read';
    }

    const current = await asyncBridge.collections.readItem({
        path: parts.path,
        workspaceId: parts.workspaceId,
    });

    if (!current.ok) {
        return current.error.code;
    }

    const result = await asyncBridge.collections.writeItem({
        fields: {
            ...current.value,
            payload: event.payload,
            payloadType: event.payloadType,
            // An emptied schema is a schema the file no longer has, so it goes out undefined:
            // the writer drops the key instead of keeping the text somebody just erased.
            schema: event.schema === '' ? undefined : event.schema,
            ...(event.expectAck === undefined ? {} : { expectAck: event.expectAck }),
        },
        path: parts.path,
        workspaceId: parts.workspaceId,
    });

    if (!result.ok) {
        return result.error.code;
    }

    composerEventsStore.getState().markSaved(connectionId);

    return null;
}
