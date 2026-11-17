import {
    type Connection,
    DEFAULT_HANDSHAKE_OPTIONS,
    DEFAULT_KEEPALIVE_OPTIONS,
    DEFAULT_RETRY_OPTIONS,
    DEFAULT_SOCKETIO_OPTIONS,
    DEFAULT_WEBSOCKET_OPTIONS,
    type SocketIoEngineTransport,
    type SocketIoVersion,
} from '@mandor/schema';

/**
 * What each group of the connection's settings says once the defaults have filled what the
 * file left out. The defaults are the app's, set in its settings over the ones of the domain;
 * the modal and the open read nothing else: one resolution, in the feature that draws it.
 */

export type ResolvedWebsocket = {
    maximumMessageSizeKiB: number;
    subprotocols: string[];
    verifyCertificate: boolean;
};

export type ResolvedRetry = {
    attempts: number;
    enabled: boolean;
    initialWaitMs: number;
    maximumWaitMs: number;
    spread: number;
};

export type ResolvedKeepalive = {
    enabled: boolean;
    intervalMs: number;
    pongTimeoutMs: number;
};

/** How long the opening handshake may wait for the server before it gives the dial up. */
export type ResolvedHandshake = {
    timeoutMs: number;
};

export type ResolvedSocketio = {
    version: SocketIoVersion;
    namespace: string;
    enginePath: string;
    engineTransport: SocketIoEngineTransport;
    ackTimeoutMs: number;
    maximumMessageSizeKiB: number;
};

/** The websocket settings that are the app's to default: how big a frame, how much trust. */
export type WebsocketDefaults = Pick<
    ResolvedWebsocket,
    'maximumMessageSizeKiB' | 'verifyCertificate'
>;

/** The Socket.IO settings that are the app's to default: how long an ack, how big a frame. */
export type SocketioDefaults = Pick<ResolvedSocketio, 'ackTimeoutMs' | 'maximumMessageSizeKiB'>;

/**
 * What every connection dials with while it keeps nothing of its own. What names a place — a
 * namespace, an engine path, the subprotocols — is the connection's alone, and has no default
 * the app could set for all of them.
 */
export type ConnectionDefaults = {
    handshake: ResolvedHandshake;
    keepalive: ResolvedKeepalive;
    retry: ResolvedRetry;
    socketio: SocketioDefaults;
    websocket: WebsocketDefaults;
};

/** The defaults of the domain, until the app sets its own. */
export const FACTORY_CONNECTION_DEFAULTS: ConnectionDefaults = {
    handshake: { ...DEFAULT_HANDSHAKE_OPTIONS },
    keepalive: { ...DEFAULT_KEEPALIVE_OPTIONS },
    retry: { ...DEFAULT_RETRY_OPTIONS },
    socketio: {
        ackTimeoutMs: DEFAULT_SOCKETIO_OPTIONS.ackTimeoutMs,
        maximumMessageSizeKiB: DEFAULT_SOCKETIO_OPTIONS.maximumMessageSizeKiB,
    },
    websocket: {
        maximumMessageSizeKiB: DEFAULT_WEBSOCKET_OPTIONS.maximumMessageSizeKiB,
        verifyCertificate: DEFAULT_WEBSOCKET_OPTIONS.verifyCertificate,
    },
};

/** The websocket settings this connection dials with, defaults included. */
export function resolvedWebsocket(
    connection: Pick<Connection, 'websocket'>,
    defaults: ConnectionDefaults = FACTORY_CONNECTION_DEFAULTS,
): ResolvedWebsocket {
    const saved = connection.websocket;

    return {
        maximumMessageSizeKiB:
            saved?.maximumMessageSizeKiB ?? defaults.websocket.maximumMessageSizeKiB,
        subprotocols: saved?.subprotocols ?? DEFAULT_WEBSOCKET_OPTIONS.subprotocols,
        verifyCertificate: saved?.verifyCertificate ?? defaults.websocket.verifyCertificate,
    };
}

/**
 * The envelope this connection wraps its frames in, when it is a websocket that declared one.
 * Socket.IO names its events at the protocol, so it has nothing to wrap: the template is a
 * decision of the transport that speaks bare text.
 */
export function frameTemplateOf(connection: Connection): string | undefined {
    if (connection.transport !== 'websocket') {
        return undefined;
    }

    return connection.websocket?.frame;
}

/**
 * Each field of `fallback`, unless `saved` decided it. What was saved comes from disk: a field
 * kept empty, or one the group no longer has, falls away.
 */
function fieldsOver<V extends object>(
    saved: { [K in keyof V]?: V[K] | undefined } | undefined,
    fallback: V,
): V {
    const kept = Object.entries(saved ?? {}).filter(
        ([key, value]: [string, unknown]) =>
            Object.hasOwn(fallback, key) && value !== undefined && value !== null,
    );

    return { ...fallback, ...Object.fromEntries(kept) };
}

/** The policy this connection comes back by when the server hangs up, defaults included. */
export function resolvedRetry(
    connection: Pick<Connection, 'retry'>,
    defaults: ConnectionDefaults = FACTORY_CONNECTION_DEFAULTS,
): ResolvedRetry {
    return fieldsOver(connection.retry, defaults.retry);
}

/** The wait this connection gives its handshake, defaults included. */
export function resolvedHandshake(
    connection: Pick<Connection, 'handshake'>,
    defaults: ConnectionDefaults = FACTORY_CONNECTION_DEFAULTS,
): ResolvedHandshake {
    return fieldsOver(connection.handshake, defaults.handshake);
}

/** The beat this connection proves its liveness by, defaults included. */
export function resolvedKeepalive(
    connection: Pick<Connection, 'keepalive'>,
    defaults: ConnectionDefaults = FACTORY_CONNECTION_DEFAULTS,
): ResolvedKeepalive {
    return fieldsOver(connection.keepalive, defaults.keepalive);
}

/** The Socket.IO settings this connection dials with, defaults included. Auth stays raw. */
export function resolvedSocketio(
    connection: Pick<Connection, 'socketio'>,
    defaults: ConnectionDefaults = FACTORY_CONNECTION_DEFAULTS,
): ResolvedSocketio {
    const fallback: ResolvedSocketio = {
        version: DEFAULT_SOCKETIO_OPTIONS.version,
        namespace: DEFAULT_SOCKETIO_OPTIONS.namespace,
        enginePath: DEFAULT_SOCKETIO_OPTIONS.enginePath,
        engineTransport: DEFAULT_SOCKETIO_OPTIONS.engineTransport,
        ackTimeoutMs: defaults.socketio.ackTimeoutMs,
        maximumMessageSizeKiB: defaults.socketio.maximumMessageSizeKiB,
    };

    return fieldsOver(connection.socketio, fallback);
}

/** The namespace a Socket.IO connection joins; a websocket joins none. */
export function namespaceOf(connection: Connection): string | undefined {
    if (connection.transport !== 'socketio') {
        return undefined;
    }

    return resolvedSocketio(connection).namespace;
}
