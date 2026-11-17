import type { RecordStatus, WsState } from '@mandor/ipc';
import type { Connection, ConnectionTransport } from '@mandor/schema';

import type { ConnectionFault } from '../../activity/activity-entry.js';

import { RESTING_RECORDING } from './connections.slice.js';
import type { ConnectionsStore } from './connections-store.js';

/** A module constant keeps a stable reference between renders for the empty case. */
const EMPTY_CONNECTIONS: Connection[] = [];

export function selectConnections(state: ConnectionsStore): readonly Connection[] {
    return state.connections.length === 0 ? EMPTY_CONNECTIONS : state.connections;
}

export function selectConnectionStateFor(
    connectionId: string,
): (state: ConnectionsStore) => WsState {
    return (state) => state.states[connectionId] ?? 'idle';
}

export function selectAttemptFor(
    connectionId: string,
): (state: ConnectionsStore) => number | undefined {
    return (state) => state.attempts[connectionId];
}

export function selectFaultFor(
    connectionId: string,
): (state: ConnectionsStore) => ConnectionFault | undefined {
    return (state) => state.faults[connectionId];
}

/** What the recorder of one connection is doing, at rest when it writes nothing. */
export function selectRecordingFor(
    connectionId: string,
): (state: ConnectionsStore) => RecordStatus {
    return (state) => state.recordings[connectionId] ?? RESTING_RECORDING;
}

/** The transport the connection dials, or nothing while nobody holds it. */
export function selectTransportFor(
    connectionId: string,
): (state: ConnectionsStore) => ConnectionTransport | undefined {
    return (state) => state.connections.find((entry) => entry.id === connectionId)?.transport;
}
