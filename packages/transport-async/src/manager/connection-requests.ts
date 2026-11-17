import type { KeepaliveSettings } from '../client/keepalive-watchdog.js';
import type { ClientProxy, ClientTls } from '../client/client-network.js';
import type { EngineTransport, SocketIoVersion } from '../client/socketio-dial.js';
import type { ReconnectPolicy } from './reconnect-policy.js';

/** The transports the manager holds. Mirrors the union the connection stores. */
export type SocketTransport = 'websocket' | 'socketio';

/**
 * What opening a connection needs. Mirrors the `WsOpenRequest` of `@mandor/ipc` field for
 * field, so the host port accepts this manager without an adapter.
 */
export type OpenConnectionRequest = {
    connectionId: string;
    transport: SocketTransport;
    url: string;
    headers?: Record<string, string> | undefined;
    subprotocols?: string[] | undefined;
    maximumMessageSizeBytes?: number | undefined;
    verifyCertificate?: boolean | undefined;
    /** The namespace this connection joins; absent is the root one. */
    namespace?: string | undefined;
    /** Where the server mounts Engine.IO. */
    enginePath?: string | undefined;
    /** How the bytes travel underneath a Socket.IO connection. */
    engineTransport?: EngineTransport | undefined;
    /** The entries the Socket.IO handshake carries as its `auth`. */
    auth?: Record<string, string> | undefined;
    /** How this connection comes back when the server hangs up. Absent: the manager default. */
    reconnect?: ReconnectPolicy | undefined;
    keepalive?: KeepaliveSettings | undefined;
    /** How long the opening handshake may take. Absent: the package default. */
    handshakeTimeoutMs?: number | undefined;
    /** An authority and a client certificate beyond the system store. */
    tls?: ClientTls | undefined;
    /** The proxy the socket tunnels through. Absent goes direct. */
    proxy?: ClientProxy | undefined;
    /** The protocol a Socket.IO server speaks. Absent: v4, which v3 servers speak too. */
    socketioVersion?: SocketIoVersion | undefined;
};

/**
 * Mirrors the `SocketSendRequest` of the host port field for field: the frame already
 * resolved, and the item it was sent from so the timeline can name it.
 */
export type SendConnectionRequest = {
    connectionId: string;
    data: string;
    origin?: string | undefined;
    /** The named event the frame is emitted to; required by the transports that speak names. */
    event?: string | undefined;
    /** The wait for an answer, resolved by the caller; absent is fire and forget. */
    expectAck?: { timeoutMs: number } | undefined;
    /** The caller read the frame against a schema and found it wanting. */
    schemaUnmet?: boolean | undefined;
};

/** Mirrors the `WsCloseRequest` of `@mandor/ipc` field for field. */
export type CloseConnectionRequest = {
    connectionId: string;
};

/** Mirrors the `WsRetryNowRequest` of `@mandor/ipc` field for field. */
export type RetryNowConnectionRequest = {
    connectionId: string;
};
