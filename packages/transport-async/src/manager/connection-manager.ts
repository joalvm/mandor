import { recordOf } from '../activity/activity-record.js';
import { armAck, cancelAcks, recordReply } from './ack-waiting.js';
import type { WsClientState } from '../client/ws-client-state.js';
import { WsClientError } from '../client/ws-client-error.js';
import type { WsMessage } from '../client/ws-message.js';
import { socketFailureReasonOf } from '../client/socket-failure-reason.js';
import { ConnectionManagerError } from './connection-manager-error.js';
import type { ConnectionManagerEvents } from './connection-manager-events.js';
import type {
    CloseConnectionRequest,
    OpenConnectionRequest,
    RetryNowConnectionRequest,
    SendConnectionRequest,
} from './connection-requests.js';
import {
    buildLiveConnection,
    openLiveConnection,
    replaceConnection,
    rewireClient,
    type LiveConnection,
    type LiveConnectionHandlers,
    type LiveConnectionSizing,
} from './live-connection.js';
import {
    cancelRetry,
    DEFAULT_RECONNECT_POLICY,
    endOpen,
    type ReconnectPolicy,
    retryConnectionNow,
    retryStatePush,
    scheduleRetry,
} from './reconnect-policy.js';
import { SocketOpenError } from './socket-open-error.js';

export type ConnectionManagerOptions = {
    /** Hard ceiling of buffered records per connection. The oldest are dropped past it. */
    bufferMax?: number;
    /** Records that trigger an immediate flush. */
    batchSize?: number;
    /** How long a partial batch waits before flushing. */
    batchWindowMs?: number;
    reconnect?: ReconnectPolicy;
};

/**
 * Many sockets alive at once, without one IPC per frame. One client per connection id,
 * activity batched per connection, and reconnection with backoff only when the close was
 * not the user's. Closing a connection removes its map entry: the map is what grows with
 * use. The surface matches the `SocketManager` port that `@mandor/host` declares.
 */
export class ConnectionManager {
    private readonly connections = new Map<string, LiveConnection>();
    private readonly sizing: LiveConnectionSizing;
    private readonly reconnect: ReconnectPolicy;
    private readonly handlers: LiveConnectionHandlers;

    constructor(
        private readonly events: ConnectionManagerEvents,
        options: ConnectionManagerOptions = {},
    ) {
        this.sizing = {
            batchSize: options.batchSize ?? 100,
            batchWindowMs: options.batchWindowMs ?? 50,
            bufferMax: options.bufferMax ?? 1_000,
        };
        this.reconnect = options.reconnect ?? DEFAULT_RECONNECT_POLICY;
        this.handlers = {
            onState: this.handleState.bind(this),
            onMessage: this.handleMessage.bind(this),
            onClosed: this.handleClosed.bind(this),
            onActivity: (connectionId, records) => {
                this.events.onActivity({ connectionId, records });
            },
        };
    }

    async open(request: OpenConnectionRequest): Promise<void> {
        const connection = buildLiveConnection(request, this.handlers, this.sizing, this.reconnect);
        const opened = new Promise<void>((resolve, reject) => {
            connection.pendingOpen = { resolve, reject };
        });
        const waiting = replaceConnection(this.connections, connection);

        openLiveConnection(this.connections, connection, waiting);

        if (waiting !== undefined) {
            opened.then(waiting.resolve, waiting.reject);
        }

        await opened;
    }

    send(request: SendConnectionRequest): Promise<void> {
        const connection = this.connections.get(request.connectionId);

        if (connection === undefined) {
            return Promise.reject(new ConnectionManagerError('send', request.connectionId));
        }

        if (connection.client.state !== 'open') {
            return Promise.reject(new WsClientError('send', connection.client.state));
        }

        // An emission that waits for an answer carries its own name: the reply links back to it,
        // and a wait past its time closes as one more frame of the timeline.
        const { record, send } = armAck(connection, request);

        connection.client.send(request.data, send);
        connection.batcher.record(record);

        return Promise.resolve();
    }

    close(request: CloseConnectionRequest): Promise<void> {
        const connection = this.connections.get(request.connectionId);

        if (connection === undefined) {
            return Promise.resolve();
        }

        connection.userClosed = true;
        cancelRetry(connection);
        cancelAcks(connection);
        connection.batcher.flush();
        this.connections.delete(request.connectionId);
        connection.client.close();

        return Promise.resolve();
    }

    retryNow(request: RetryNowConnectionRequest): Promise<void> {
        retryConnectionNow(this.connections.get(request.connectionId), (connection) => {
            this.retry(connection);
        });

        return Promise.resolve();
    }

    disposeAll(): void {
        for (const connection of this.connections.values()) {
            connection.userClosed = true;
            cancelRetry(connection);
            cancelAcks(connection);
            connection.batcher.dispose();
            connection.client.dispose();
        }

        this.connections.clear();
    }

    private handleState(connection: LiveConnection, state: WsClientState): void {
        this.events.onState({ connectionId: connection.request.connectionId, state });

        if (state === 'open') {
            connection.openedOnce = true;
            connection.openedAt = Date.now();

            if (connection.pendingOpen !== undefined) {
                connection.pendingOpen.resolve();
                connection.pendingOpen = undefined;
            }
        }
    }

    private handleMessage(connection: LiveConnection, message: WsMessage): void {
        connection.batcher.record(
            message.replyTo === undefined
                ? recordOf('in', message.data, undefined, message.event)
                : recordReply(connection, message),
        );
    }

    /**
     * A retry push says why the attempt before it ended, unless that attempt was a live socket
     * dropping. Attempts go back to zero only after a socket that stayed open a while, so a
     * server that keeps hanging up at once runs out of them.
     */
    private handleClosed(connection: LiveConnection): void {
        const dropped = endOpen(connection, Date.now());
        const reason = socketFailureReasonOf(connection.lastError);

        if (connection.pendingOpen !== undefined) {
            connection.pendingOpen.reject(new SocketOpenError(reason, connection.lastError));
            connection.pendingOpen = undefined;
        }

        connection.batcher.flush();

        const outcome = scheduleRetry(connection, connection.policy, () => {
            this.retry(connection);
        });
        const push = retryStatePush(connection.request.connectionId, connection, outcome);

        if (push !== undefined) {
            this.events.onState(dropped ? push : { ...push, reason });
        }

        if (outcome !== 'scheduled') {
            this.release(connection);
        }
    }

    /**
     * A connection that ended for good leaves the map, as a close by the user does: it held the
     * headers and the keys it opened with, and nothing closes an id whose view reads it as ended
     * — not leaving the origin either — so kept, they outlived the origin they were resolved from.
     */
    private release(connection: LiveConnection): void {
        const { connectionId } = connection.request;

        cancelAcks(connection);
        connection.batcher.dispose();
        connection.client.dispose();

        if (this.connections.get(connectionId) === connection) {
            this.connections.delete(connectionId);
        }
    }

    private retry(connection: LiveConnection): void {
        connection.client.dispose();
        connection.lastError = undefined;
        connection.client = rewireClient(connection, this.handlers);
        connection.client.open();
    }
}
