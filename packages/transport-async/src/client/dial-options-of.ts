import type { ClientOptions } from 'ws';

import {
    DEFAULT_HANDSHAKE_TIMEOUT_MS,
    tlsOptionsOf,
    type ClientProxy,
    type ClientTls,
} from './client-network.js';
import type { KeepaliveSettings } from './keepalive-watchdog.js';
import { proxyAgentOf } from './proxy-agent-of.js';

export type WsClientOptions = {
    headers?: Record<string, string> | undefined;
    subprotocols?: string[] | undefined;
    /** Largest inbound frame accepted, in bytes; a bigger one closes the connection. */
    maximumPayloadBytes?: number | undefined;
    /** Whether wss validates the server certificate. Absent means it does. */
    verifyCertificate?: boolean | undefined;
    /** The beat the socket proves its liveness by. Absent means the line stays silent. */
    keepalive?: KeepaliveSettings | undefined;
    /** How long the opening handshake may take. Absent is the default of the package. */
    handshakeTimeoutMs?: number | undefined;
    /** An authority and a client certificate beyond the system store. */
    tls?: ClientTls | undefined;
    /** The proxy the socket tunnels through. Absent goes direct. */
    proxy?: ClientProxy | undefined;
};

/** What `ws` dials with for these options: only what they set, over the defaults of `ws`. */
export function dialOptionsOf(options: WsClientOptions): ClientOptions {
    const agent = proxyAgentOf(options.proxy);

    return {
        handshakeTimeout: options.handshakeTimeoutMs ?? DEFAULT_HANDSHAKE_TIMEOUT_MS,
        ...tlsOptionsOf(options.tls),
        ...(agent === undefined ? {} : { agent }),
        ...(options.headers === undefined ? {} : { headers: options.headers }),
        ...(options.maximumPayloadBytes === undefined
            ? {}
            : { maxPayload: options.maximumPayloadBytes }),
        ...(options.verifyCertificate === false ? { rejectUnauthorized: false } : {}),
    };
}
