import { WS_FAILURE_CODE, type WsFailureReason } from '@mandor/ipc';

import type { ConnectionFault, NewActivityEntry } from '../../../activity/activity-entry.js';

/**
 * The entry a retry push writes on the timeline: why the attempt before it could not open, or,
 * with no reason, that a live socket dropped.
 */
export function connectionFaultEntry(
    reason: WsFailureReason | undefined,
    at: number = Date.now(),
): NewActivityEntry {
    const code = reason === undefined ? 'ws-connection-lost' : WS_FAILURE_CODE[reason];
    const fault: ConnectionFault = { at, code };

    return { at, bytes: 0, detail: fault, kind: 'connection-fault' };
}
