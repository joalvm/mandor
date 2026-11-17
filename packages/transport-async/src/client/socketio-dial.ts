// The typings of the v2 client are ambient, and an import cannot carry an ambient declaration
// into the projects that read this file: only a reference does.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./socket.io-client-v2.d.ts" />
import { io } from 'socket.io-client';
import ioV2 from 'socket.io-client-v2';

import {
    DEFAULT_HANDSHAKE_TIMEOUT_MS,
    tlsOptionsOf,
    type ClientProxy,
    type ClientTls,
} from './client-network.js';
import { credentialsAsHeader } from '../url/url-credentials.js';
import { pollingAgentOf } from './polling-agent-of.js';
import { proxyAgentOf } from './proxy-agent-of.js';

/** How the bytes travel underneath the Socket.IO protocol. */
export type EngineTransport = 'websocket-only' | 'polling-only' | 'polling-then-upgrade';

/** The protocol the server speaks: v3 and v4 share one, v2 is the one before it. */
export type SocketIoVersion = 'v4' | 'v2';

export type SocketIoDialOptions = {
    /** Where the server mounts Engine.IO. */
    enginePath?: string | undefined;
    /** How the bytes travel underneath. Absent is the client default: polling, then upgrade. */
    engineTransport?: EngineTransport | undefined;
    /** The entries the handshake carries as its `auth`; a v2 server reads them in the query. */
    auth?: Record<string, string> | undefined;
    /** The headers every request of the handshake carries, auth headers included. */
    headers?: Record<string, string> | undefined;
    /** Whether wss and https validate the server certificate. Absent means they do. */
    verifyCertificate?: boolean | undefined;
    /**
     * Largest inbound websocket frame accepted, in bytes; a bigger one closes the connection.
     * The v2 client does not hand it to its websocket, which keeps the ceiling of `ws`.
     */
    maximumPayloadBytes?: number | undefined;
    /** How long the handshake may take. Absent is the default of the package. */
    handshakeTimeoutMs?: number | undefined;
    tls?: ClientTls | undefined;
    proxy?: ClientProxy | undefined;
    /** Absent is v4, which v3 servers speak too. */
    version?: SocketIoVersion | undefined;
};

type Listener = (...args: never[]) => void;

/** What the client asks of a socket, whichever version dialled it. */
export type DialedSocket = {
    on: (event: string, listener: Listener) => unknown;
    onAny: (listener: (event: string, ...args: unknown[]) => void) => unknown;
    emit: (event: string, ...args: unknown[]) => unknown;
    connect: () => unknown;
    disconnect: () => unknown;
    removeAllListeners: () => unknown;
};

const ENGINE_TRANSPORTS: Record<EngineTransport, string[]> = {
    'polling-only': ['polling'],
    'polling-then-upgrade': ['polling', 'websocket'],
    'websocket-only': ['websocket'],
};

type Dial = (uri: string, options: SocketIoDialOptions) => DialedSocket;

/** The dial each protocol version answers by, keyed by the version the server speaks. */
const DIALS: Record<SocketIoVersion, Dial> = {
    v2: dialV2,
    // The typed `on` of the v4 client names each reserved event's listener, which a listener of
    // any arguments cannot meet: the socket is the surface below, said once here.
    v4: (uri, options) =>
        io(uri, {
            ...sharedOptionsOf(uri, options),
            ...(options.auth === undefined ? {} : { auth: options.auth }),
        }) as unknown as DialedSocket,
};

/**
 * One socket, not yet connected, dialled with the protocol the server speaks, on a transport of
 * its own. The protocol's own reconnection and its auto-connect stay off: Mandor owns the retry
 * policy and the moment of dialling.
 */
export function dialSocketIo(uri: string, options: SocketIoDialOptions): DialedSocket {
    const dialed = credentialsAsHeader(uri, options.headers);

    return DIALS[options.version ?? 'v4'](dialed.uri, { ...options, headers: dialed.headers });
}

function sharedOptionsOf(uri: string, options: SocketIoDialOptions): Record<string, unknown> {
    const agent = proxyAgentOf(options.proxy);
    const secure = new URL(uri).protocol === 'https:';

    return {
        autoConnect: false,
        // The client keeps one transport per server and lends it to every namespace dialled
        // there later: another connection would ride the headers, the proxy and the trust of
        // the first. Each connection is its own person.
        forceNew: true,
        reconnection: false,
        timeout: options.handshakeTimeoutMs ?? DEFAULT_HANDSHAKE_TIMEOUT_MS,
        ...tlsOptionsOf(options.tls),
        ...(agent === undefined ? {} : { agent }),
        transportOptions: { polling: { agent: pollingAgentOf(secure, agent) } },
        ...(options.headers === undefined ? {} : { extraHeaders: options.headers }),
        ...(options.enginePath === undefined ? {} : { path: options.enginePath }),
        ...(options.engineTransport === undefined
            ? {}
            : { transports: ENGINE_TRANSPORTS[options.engineTransport] }),
        ...(options.maximumPayloadBytes === undefined
            ? {}
            : { maxPayload: options.maximumPayloadBytes }),
        ...(options.verifyCertificate === false ? { rejectUnauthorized: false } : {}),
    };
}

/** An event packet: the v2 client hands `onevent` only those, and always with their data. */
type V2Packet = { data: unknown[] };

type AnyListener = (event: string, ...args: unknown[]) => void;

type V2Socket = Omit<DialedSocket, 'onAny'> & { onevent: (packet: V2Packet) => void };

/**
 * A v2 socket behind the same surface: the protocol had no `auth`, so the entries ride the
 * query the way v2 servers read them, and it had no `onAny`, so every named event is heard at
 * the one door they all come through.
 */
function dialV2(uri: string, options: SocketIoDialOptions): DialedSocket {
    const socket = ioV2(uri, {
        ...sharedOptionsOf(uri, options),
        ...(options.auth === undefined ? {} : { query: options.auth }),
    }) as V2Socket;
    const anyListeners: AnyListener[] = [];
    const deliver = socket.onevent.bind(socket);

    socket.onevent = (packet) => {
        const [event, ...args] = packet.data;

        if (typeof event === 'string') {
            for (const listener of anyListeners) {
                listener(event, ...args);
            }
        }

        deliver(packet);
    };

    return {
        on: (event, listener) => {
            if (event !== 'connect_error') {
                return socket.on(event, listener);
            }

            // v2 hands a failed attempt over as whatever the engine said: often a bare string.
            return socket.on(event, (failure: unknown) => {
                (listener as (error: Error) => void)(
                    failure instanceof Error ? failure : new Error(String(failure)),
                );
            });
        },
        onAny: (listener) => {
            anyListeners.push(listener);
        },
        emit: (event, ...args) => socket.emit(event, ...args),
        connect: () => socket.connect(),
        disconnect: () => socket.disconnect(),
        removeAllListeners: () => {
            anyListeners.length = 0;

            return socket.removeAllListeners();
        },
    };
}
