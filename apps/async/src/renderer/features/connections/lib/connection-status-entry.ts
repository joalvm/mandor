import type { WsState } from '@mandor/ipc';

import type { ConnectionStatus, NewActivityEntry } from '../../../activity/activity-entry.js';

/** Whether the socket was up in this state: leaving it for `closed` is a disconnection. */
const UP: Record<WsState, boolean> = {
    closed: false,
    closing: true,
    connecting: false,
    error: false,
    idle: false,
    open: true,
    reconnecting: false,
};

/**
 * The line a change of state writes, read from where the socket arrives. It comes up whenever it
 * reaches `open`; it goes down only when it closes from up — a socket that failed on the way is
 * a fault, and the fault already says so.
 */
const STATUS_OF_STATE: Record<WsState, (previous: WsState) => ConnectionStatus | undefined> = {
    closed: (previous) => (UP[previous] ? 'disconnected' : undefined),
    closing: () => undefined,
    connecting: () => undefined,
    error: () => undefined,
    idle: () => undefined,
    open: () => 'connected',
    reconnecting: () => undefined,
};

/**
 * The entry a state push writes on the timeline when the socket comes up or goes down, or
 * nothing when the change is a step on the way.
 */
export function connectionStatusEntry(
    previous: WsState,
    next: WsState,
    at: number = Date.now(),
): NewActivityEntry | undefined {
    const status = STATUS_OF_STATE[next](previous);

    if (status === undefined) {
        return undefined;
    }

    return { at, bytes: 0, detail: { status }, kind: 'connection-status' };
}
