import type { ConnectionTransport, SocketIoVersion } from '@mandor/schema';
import type { ActivityRecord, WsCloseRequest, WsRetryNowRequest, WsStatePush } from '@mandor/ipc';

/** The certificate material of one dial, read from disk by main; the passphrase unsealed. */
type SocketTls = {
    ca?: string | undefined;
    cert?: string | undefined;
    key?: string | undefined;
    pfx?: Uint8Array | undefined;
    passphrase?: string | undefined;
};

export type SocketOpenRequest = {
    connectionId: string;
    transport: ConnectionTransport;
    url: string;
    headers?: Record<string, string> | undefined;
    subprotocols?: string[] | undefined;
    /** Largest inbound frame accepted, in bytes; a bigger one closes the connection. */
    maximumMessageSizeBytes?: number | undefined;
    /** Whether wss validates the server certificate. Absent means it does. */
    verifyCertificate?: boolean | undefined;
    /** How long the opening handshake may take. Absent: the transport default. */
    handshakeTimeoutMs?: number | undefined;
    /** An authority and a client certificate beyond the system store. */
    tls?: SocketTls | undefined;
    /** The proxy the socket tunnels through. Absent goes direct. */
    proxy?: { url: string } | undefined;
    /** The protocol a Socket.IO server speaks. Absent: v4. */
    socketioVersion?: SocketIoVersion | undefined;
    /** The namespace this connection joins; absent is the root one. */
    namespace?: string | undefined;
    /** Where the server mounts Engine.IO. */
    enginePath?: string | undefined;
    /** How the bytes travel underneath a Socket.IO connection. */
    engineTransport?: 'websocket-only' | 'polling-only' | 'polling-then-upgrade' | undefined;
    /** The entries the Socket.IO handshake carries as its `auth`. */
    auth?: Record<string, string> | undefined;
    /** How the connection comes back when the server hangs up. Absent: the transport default. */
    reconnect?:
        | { baseMs: number; ceilingMs: number; maxAttempts: number; spread?: number | undefined }
        | undefined;
    keepalive?: { intervalMs: number; pongTimeoutMs: number } | undefined;
};

/**
 * One frame on its way out, already resolved. The template stayed in main: what crosses to a
 * transport is text, plus the collection item it came from so the timeline can name it.
 */
export type SocketSendRequest = {
    connectionId: string;
    data: string;
    origin?: string | undefined;
    event?: string | undefined;
    expectAck?: { timeoutMs: number } | undefined;
    schemaUnmet?: boolean | undefined;
};

type SocketActivityPush = {
    connectionId: string;
    records: ActivityRecord[];
};

/** What the port reports back. Both arrive already shaped as the push of their channel. */
export type SocketManagerEvents = {
    onState: (push: WsStatePush) => void;
    onActivity: (push: SocketActivityPush) => void;
};

/**
 * The sockets, as the host sees them. The host declares this port and never implements it:
 * choosing a transport belongs to `apps/*`, and a package that imports one has decided for
 * every app that will ever use it.
 *
 * What lives behind here is the map of live connections, the bounded buffer of each one and
 * the batching that keeps a busy socket from becoming one IPC per frame. The host only
 * validates what the renderer sent, routes it, and forwards what comes back.
 */
export type SocketManager = {
    open: (request: SocketOpenRequest) => Promise<void>;
    send: (request: SocketSendRequest) => Promise<void>;
    close: (request: WsCloseRequest) => Promise<void>;
    /** Cancels the wait of a pending reconnect and opens again now. A no-op with none waiting. */
    retryNow: (request: WsRetryNowRequest) => Promise<void>;
    /** Teardown answers nobody, so it does not hand back a promise for nobody to await. */
    disposeAll: () => void;
};

/** How the app hands its transport over: the host gives the events, the app gives the port. */
export type CreateSocketManager = (events: SocketManagerEvents) => SocketManager;
