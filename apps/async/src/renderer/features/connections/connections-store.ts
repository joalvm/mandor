import type { ErrorCode, RecordStatus, WsState } from '@mandor/ipc';
import { byName, type Connection } from '@mandor/schema';
import { scopeToOrigin } from '@mandor/shell';
import { createStore, type StoreApi } from 'zustand/vanilla';

import type { ConnectionFault } from '../../activity/activity-entry.js';

import { initialConnectionsSlice, type ConnectionsSlice } from './connections.slice.js';

type ConnectionsActions = {
    removeConnection: (connectionId: string) => void;
    reset: () => void;
    setActiveConnection: (connectionId: string | null) => void;
    setConnectionError: (connectionId: string, code: ErrorCode | null) => void;
    setConnections: (connections: Connection[]) => void;
    setConnectionState: (connectionId: string, state: WsState, attempt?: number) => void;
    setRecording: (connectionId: string, recording: RecordStatus) => void;
    setRenaming: (connectionId: string | null) => void;
    upsertConnection: (connection: Connection) => void;
};

export type ConnectionsStore = ConnectionsActions & ConnectionsSlice;
export type ConnectionsStoreApi = StoreApi<ConnectionsStore>;

function upsert<T extends { id: string }>(list: readonly T[], entry: T): T[] {
    if (list.some((existing) => existing.id === entry.id)) {
        return list.map((existing) => (existing.id === entry.id ? entry : existing));
    }

    return [...list, entry];
}

function without<T>(entries: Record<string, T>, key: string): Record<string, T> {
    return Object.fromEntries(Object.entries(entries).filter(([each]) => each !== key));
}

/**
 * The moment each socket opened. It is stamped when the socket lands on open, kept while it stays
 * there, and forgotten as soon as it is anything else: a socket that opens again counts anew.
 */
function updatedOpenings(
    openings: Record<string, number>,
    connectionId: string,
    wsState: WsState,
): Record<string, number> {
    if (wsState !== 'open') {
        return without(openings, connectionId);
    }

    if (openings[connectionId] !== undefined) {
        return openings;
    }

    return { ...openings, [connectionId]: Date.now() };
}

function updatedFaults(
    faults: Record<string, ConnectionFault>,
    connectionId: string,
    code: ErrorCode | null,
): Record<string, ConnectionFault> {
    const current = faults[connectionId];

    if (code === null && current === undefined) {
        return faults;
    }

    if (code !== null && current?.code === code) {
        return faults;
    }

    if (code === null) {
        return Object.fromEntries(Object.entries(faults).filter(([key]) => key !== connectionId));
    }

    // The moment of the failure is stamped on arrival: it is what puts the row in the timeline.
    return { ...faults, [connectionId]: { at: Date.now(), code } };
}

function actionsFor(set: ConnectionsStoreApi['setState']): ConnectionsActions {
    const actions: ConnectionsActions = {
        /** What is gone from disk is gone from memory, live state included. */
        removeConnection: (connectionId) => {
            set((state) => ({
                activeConnectionId:
                    state.activeConnectionId === connectionId ? null : state.activeConnectionId,
                attempts: without(state.attempts, connectionId),
                connections: state.connections.filter((entry) => entry.id !== connectionId),
                faults: without(state.faults, connectionId),
                openedAt: without(state.openedAt, connectionId),
                recordings: without(state.recordings, connectionId),
                renaming: state.renaming === connectionId ? null : state.renaming,
                states: without(state.states, connectionId),
            }));
        },
        reset: () => {
            set({ ...initialConnectionsSlice(), ...actions }, true);
        },
        setActiveConnection: (activeConnectionId) => {
            set({ activeConnectionId });
        },
        setConnectionError: (connectionId, code) => {
            set((state) => ({ faults: updatedFaults(state.faults, connectionId, code) }));
        },
        setConnections: (connections) => {
            set({ connections: [...connections] });
        },
        setRecording: (connectionId, recording) => {
            set((state) => ({
                recordings: { ...state.recordings, [connectionId]: recording },
            }));
        },
        setRenaming: (renaming) => {
            set({ renaming });
        },
        setConnectionState: (connectionId, wsState, attempt) => {
            set((state) => ({
                states: { ...state.states, [connectionId]: wsState },
                openedAt: updatedOpenings(state.openedAt, connectionId, wsState),
                attempts:
                    attempt === undefined
                        ? state.attempts
                        : { ...state.attempts, [connectionId]: attempt },
            }));
        },
        upsertConnection: (connection) => {
            set((state) => ({
                connections: upsert(state.connections, connection).toSorted(byName),
            }));
        },
    };

    return actions;
}

export function createConnectionsStore(): ConnectionsStoreApi {
    return createStore<ConnectionsStore>()((set) => {
        const actions = actionsFor(set);

        return { ...initialConnectionsSlice(), ...actions };
    });
}

export const connectionsStore = scopeToOrigin(createConnectionsStore());
