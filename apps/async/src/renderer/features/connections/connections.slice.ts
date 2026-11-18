import type { RecordStatus, WsState } from '@mandor/ipc';
import type { Connection } from '@mandor/schema';

import type { ConnectionFault } from '../../activity/activity-entry.js';

/** The resting answer for every connection the recorder does not write. */
export const RESTING_RECORDING: RecordStatus = Object.freeze({ active: false, entries: 0 });

export type ConnectionsSlice = {
    activeConnectionId: string | null;
    attempts: Record<string, number>;
    connections: Connection[];
    faults: Record<string, ConnectionFault>;
    recordings: Record<string, RecordStatus>;
    /** The connection whose row is being renamed in place, if any. */
    renaming: string | null;
    states: Record<string, WsState>;
};

export function initialConnectionsSlice(): ConnectionsSlice {
    return {
        activeConnectionId: null,
        attempts: {},
        connections: [],
        faults: {},
        recordings: {},
        renaming: null,
        states: {},
    };
}
