import { z } from 'zod';

import {
    DEFAULT_MAXIMUM_MESSAGE_SIZE_KIB,
    maximumMessageSizeKiBSchema,
} from './websocket-options.js';

/** How the connection travels underneath the Socket.IO protocol. */
export const SOCKETIO_ENGINE_TRANSPORTS = [
    'websocket-only',
    'polling-only',
    'polling-then-upgrade',
] as const;

export type SocketIoEngineTransport = (typeof SOCKETIO_ENGINE_TRANSPORTS)[number];

/** The protocol the server speaks: v3 and v4 share one, v2 is the one before it. */
export const SOCKETIO_VERSIONS = ['v4', 'v2'] as const;

export type SocketIoVersion = (typeof SOCKETIO_VERSIONS)[number];

/**
 * The settings a Socket.IO connection carries beside its url. Every field stands alone: a file
 * may name one and not the others, and what is absent is the default, so a hand-written file
 * stays readable no matter which half of it was edited.
 */
export type SocketIoOptions = {
    /** The namespace this connection joins; the root one is what every server exposes. */
    namespace?: string | undefined;
    /** Where the server mounts Engine.IO. Not the namespace: changing it only if the server did. */
    enginePath?: string | undefined;
    /** How the bytes travel underneath. Polling only helps when the upgrade is refused. */
    engineTransport?: SocketIoEngineTransport | undefined;
    /** The entries the handshake carries as its `auth`. Values accept `{{vars}}`. */
    auth?: Record<string, string> | undefined;
    /**
     * Auth entries that are written but switched off. They are not sent, and they are not in
     * `auth`: an entry is either on — and sent — or here, kept for the day it comes back.
     */
    disabledAuth?: Record<string, string> | undefined;
    /** How long an emit that asked for an answer waits before it is reported as unanswered. */
    ackTimeoutMs?: number | undefined;
    /** The protocol the server speaks. A v2 server reads the auth entries in the query. */
    version?: SocketIoVersion | undefined;
    /**
     * Largest inbound websocket frame accepted, in KiB; a bigger one closes the connection.
     * The v2 client keeps the ceiling of its own websocket.
     */
    maximumMessageSizeKiB?: number | undefined;
};

// A namespace, and the route on the server Engine.IO is mounted at, are paths: each is led by a
// slash, with no room for spaces in it.
const SLASH_PATH = /^\/[^\s]*$/u;

export const socketIoOptionsSchema = z.object({
    namespace: z.string().regex(SLASH_PATH).max(256).optional(),
    enginePath: z.string().regex(SLASH_PATH).max(256).optional(),
    engineTransport: z.enum(SOCKETIO_ENGINE_TRANSPORTS).optional(),
    auth: z.record(z.string(), z.string()).optional(),
    disabledAuth: z.record(z.string(), z.string()).optional(),
    ackTimeoutMs: z.number().int().positive().max(3_600_000).optional(),
    version: z.enum(SOCKETIO_VERSIONS).optional(),
    maximumMessageSizeKiB: maximumMessageSizeKiBSchema.optional(),
});

/** What a connection without options of its own dials with. */
export const DEFAULT_SOCKETIO_OPTIONS = {
    namespace: '/',
    enginePath: '/socket.io',
    engineTransport: 'websocket-only',
    auth: {},
    disabledAuth: {},
    ackTimeoutMs: 10_000,
    version: 'v4',
    maximumMessageSizeKiB: DEFAULT_MAXIMUM_MESSAGE_SIZE_KIB,
} satisfies SocketIoOptions;
