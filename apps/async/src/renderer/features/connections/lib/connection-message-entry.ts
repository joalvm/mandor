import type { ActivityRecord } from '@mandor/ipc';

import type { ConnectionMessage, NewActivityEntry } from '../../../activity/activity-entry.js';
import { frameByteLength } from '../../../activity/lib/frame-payload.js';

/**
 * A frame on its way into the timeline. What it weighs is measured here, once on arrival: the
 * buffer caps itself by bytes, and re-encoding the payload on every draw to find out would cost
 * more than what it holds.
 */
export function messageEntry(
    record: ActivityRecord,
    environmentId: string | null = null,
): NewActivityEntry {
    const message: ConnectionMessage = { ...record, environmentId };

    return {
        at: record.at,
        bytes: frameByteLength(record),
        detail: message,
        kind: 'connection-message',
    };
}
