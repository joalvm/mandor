import { ActivityBatcher } from '../activity/activity-batcher.js';
import type { ActivityRecord } from '../activity/activity-record.js';
import type { AsyncClient, AsyncClientEvents } from '../client/async-client.js';
import type { WsClientState } from '../client/ws-client-state.js';
import type { WsMessage } from '../client/ws-message.js';
import { clientOf } from './client-of.js';
import type { OpenConnectionRequest } from './connection-requests.js';
import { cancelRetry, type ReconnectPolicy } from './reconnect-policy.js';

/** One connection the manager holds: its socket, its batcher, and its retry bookkeeping. */
export type LiveConnection = {
    request: OpenConnectionRequest;
    client: AsyncClient;
    batcher: ActivityBatcher;
    /** The policy this connection came in with; the manager default filled it when absent. */
    policy: ReconnectPolicy;
    reconnectTimer: Timer | undefined;
    pendingOpen: { resolve: () => void; reject: (error: unknown) => void } | undefined;
    userClosed: boolean;
    /** Whether the socket ever opened: a first attempt that never opened is not retried. */
    openedOnce: boolean;
    /** When the socket of this attempt opened; none while the attempt has not opened. */
    openedAt: number | undefined;
    attempts: number;
    /** The last error the socket raised: why its attempt ended. A new attempt starts without one. */
    lastError: unknown;
    /** The sequence that names emissions asking for an answer, and the waits still open. */
    ackSeq: number;
    /** The waits still open: when the emission left, its name, and the close of the wait. */
    acks: Map<string, { at: number; event: string | undefined; timer: Timer }>;
};

/** What the manager does with whatever happens on the socket. */
export type LiveConnectionHandlers = {
    onState: (connection: LiveConnection, state: WsClientState) => void;
    onMessage: (connection: LiveConnection, message: WsMessage) => void;
    onClosed: (connection: LiveConnection) => void;
    onActivity: (connectionId: string, records: ActivityRecord[]) => void;
};

export type LiveConnectionSizing = {
    batchSize: number;
    batchWindowMs: number;
    bufferMax: number;
};

type Timer = ReturnType<typeof setTimeout>;

export function buildLiveConnection(
    request: OpenConnectionRequest,
    handlers: LiveConnectionHandlers,
    sizing: LiveConnectionSizing,
    defaultPolicy: ReconnectPolicy,
): LiveConnection {
    const connection: LiveConnection = {
        request,
        client: clientOf(
            request,
            eventsOf(() => connection, handlers),
        ),
        batcher: new ActivityBatcher(
            (records) => {
                handlers.onActivity(request.connectionId, records);
            },
            sizing.batchSize,
            sizing.batchWindowMs,
            sizing.bufferMax,
        ),
        policy: request.reconnect ?? defaultPolicy,
        reconnectTimer: undefined,
        pendingOpen: undefined,
        userClosed: false,
        openedOnce: false,
        openedAt: undefined,
        attempts: 0,
        lastError: undefined,
        ackSeq: 0,
        acks: new Map(),
    };

    return connection;
}

/**
 * Puts a connection under its id. An id already held is the renderer dialling again after it
 * lost track of the socket it had — a window that reloads forgets every state — and refusing
 * would keep that id taken for as long as main lives. The old socket goes quietly: no close is
 * pushed and no retry is scheduled for it. Whoever still waits on its open is handed back, to
 * settle along with the socket that replaced it.
 */
export function replaceConnection(
    connections: Map<string, LiveConnection>,
    connection: LiveConnection,
): LiveConnection['pendingOpen'] {
    const connectionId = connection.request.connectionId;
    const previous = connections.get(connectionId);

    connections.set(connectionId, connection);

    if (previous === undefined) {
        return undefined;
    }

    previous.userClosed = true;
    cancelRetry(previous);
    previous.batcher.flush();
    previous.client.dispose();

    return previous.pendingOpen;
}

/** Opens the client; a throw here means nothing was ever live, so the entry is rolled back. */
export function openLiveConnection(
    connections: Map<string, LiveConnection>,
    connection: LiveConnection,
    waiting: LiveConnection['pendingOpen'],
): void {
    try {
        connection.client.open();
    } catch (error) {
        connections.delete(connection.request.connectionId);
        connection.pendingOpen = undefined;
        waiting?.reject(error);
        throw error;
    }
}

/** A fresh client for a retry: same request, same handlers, new socket. */
export function rewireClient(
    connection: LiveConnection,
    handlers: LiveConnectionHandlers,
): AsyncClient {
    return clientOf(
        connection.request,
        eventsOf(() => connection, handlers),
    );
}

function eventsOf(
    connection: () => LiveConnection,
    handlers: LiveConnectionHandlers,
): AsyncClientEvents {
    return {
        onState: (state) => {
            handlers.onState(connection(), state);
        },
        onMessage: (message) => {
            handlers.onMessage(connection(), message);
        },
        onClose: () => {
            handlers.onClosed(connection());
        },
        // The state push already reports the error; the close that follows says why with it.
        onError: (error) => {
            connection().lastError = error;
        },
    };
}
