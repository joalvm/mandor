import type {
    ActivityEntry,
    ConnectionFault,
    ConnectionFaultEntry,
} from '../../../activity/activity-entry.js';

/**
 * The failure of a connection as one more line of its timeline, composed on the way to the log
 * instead of pushed into the buffer: a fault is a state that clears, and the line stops being
 * drawn the moment the connection stops failing.
 */
export function timelineWithFault(
    entries: readonly ActivityEntry[],
    fault: ConnectionFault | undefined,
): readonly ActivityEntry[] {
    if (fault === undefined) {
        return entries;
    }

    const line: ConnectionFaultEntry = {
        at: fault.at,
        bytes: 0,
        detail: fault,
        id: `fault-${String(fault.at)}`,
        kind: 'connection-fault',
    };

    return [...entries, line];
}
