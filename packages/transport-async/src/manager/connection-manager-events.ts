import type { ActivityRecord } from '../activity/activity-record.js';
import type { SocketFailureReason } from '../client/socket-failure-reason.js';
import type { WsClientState } from '../client/ws-client-state.js';

/** Mirrors the `WsStatePush` of `@mandor/ipc` field for field. */
export type ConnectionStatePush = {
    attempt?: number;
    connectionId: string;
    /** Why the attempt a retry push follows could not open. Absent: a live socket dropped. */
    reason?: SocketFailureReason;
    state: WsClientState;
};

/** Mirrors the `WsActivityPush` of `@mandor/ipc` field for field. */
export type ConnectionActivityPush = {
    connectionId: string;
    records: ActivityRecord[];
};

/**
 * What the manager reports. Shaped as the pushes of the `SocketManager` port that
 * `@mandor/host` declares, so an app wires the two without mapping code.
 */
export type ConnectionManagerEvents = {
    onState: (push: ConnectionStatePush) => void;
    onActivity: (push: ConnectionActivityPush) => void;
};
