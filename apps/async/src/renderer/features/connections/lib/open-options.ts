import type { Connection, ConnectionTransport } from '@mandor/schema';

import {
    FACTORY_CONNECTION_DEFAULTS,
    resolvedHandshake,
    resolvedKeepalive,
    resolvedRetry,
    resolvedSocketio,
    resolvedWebsocket,
    type ConnectionDefaults,
} from './connection-settings.js';

/** What opening a connection tells the socket besides the url and the headers it resolved. */
export type OpenSocketOptions = {
    handshakeTimeoutMs?: number;
    subprotocols?: string[];
    maximumMessageSizeBytes?: number;
    verifyCertificate?: boolean;
    reconnect?: { baseMs: number; ceilingMs: number; maxAttempts: number; spread: number };
    keepalive?: { intervalMs: number; pongTimeoutMs: number };
};

type TransportOptions = (
    connection: Connection,
    defaults: ConnectionDefaults,
) => Partial<OpenSocketOptions>;

/** The dial options each transport adds, keyed by the transport that owns them. */
const TRANSPORT_OPTIONS: Record<ConnectionTransport, TransportOptions> = {
    socketio: socketioOptionsOf,
    websocket: websocketOptionsOf,
};

/** The frame ceiling travels in KiB in the file and in bytes in the socket. */
const KIB = 1024;

/** A policy that spends no attempt: how retry-off dials. */
const NEVER: { baseMs: number; ceilingMs: number; maxAttempts: number; spread: number } = {
    baseMs: 0,
    ceilingMs: 0,
    maxAttempts: 0,
    spread: 0,
};

/**
 * What this connection dials with: what it saved, filled up to the defaults of the app.
 * Absent never reaches the socket — the defaults are decided once, here, and never twice.
 */
export function openOptionsOf(
    connection: Connection,
    defaults: ConnectionDefaults = FACTORY_CONNECTION_DEFAULTS,
): OpenSocketOptions {
    const retry = resolvedRetry(connection, defaults);
    const keepalive = resolvedKeepalive(connection, defaults);

    return {
        ...TRANSPORT_OPTIONS[connection.transport](connection, defaults),
        handshakeTimeoutMs: resolvedHandshake(connection, defaults).timeoutMs,
        reconnect: retry.enabled
            ? {
                  baseMs: retry.initialWaitMs,
                  ceilingMs: retry.maximumWaitMs,
                  maxAttempts: retry.attempts,
                  spread: retry.spread,
              }
            : NEVER,
        ...(keepalive.enabled
            ? {
                  keepalive: {
                      intervalMs: keepalive.intervalMs,
                      pongTimeoutMs: keepalive.pongTimeoutMs,
                  },
              }
            : {}),
    };
}

/**
 * Only the ceiling of a frame rides the socket for Socket.IO: the rest of its group travels with
 * the open itself.
 */
function socketioOptionsOf(
    connection: Connection,
    defaults: ConnectionDefaults,
): Partial<OpenSocketOptions> {
    const { maximumMessageSizeKiB } = resolvedSocketio(connection, defaults);

    return { maximumMessageSizeBytes: maximumMessageSizeKiB * KIB };
}

function websocketOptionsOf(
    connection: Connection,
    defaults: ConnectionDefaults,
): Partial<OpenSocketOptions> {
    const { maximumMessageSizeKiB, subprotocols, verifyCertificate } = resolvedWebsocket(
        connection,
        defaults,
    );

    return {
        maximumMessageSizeBytes: maximumMessageSizeKiB * KIB,
        ...(subprotocols.length === 0 ? {} : { subprotocols: [...subprotocols] }),
        verifyCertificate,
    };
}
