import {
    handshakeOptionsSchema,
    keepaliveOptionsSchema,
    retryOptionsSchema,
    socketIoOptionsSchema,
    websocketOptionsSchema,
} from '@mandor/schema';
import { createStore } from 'zustand/vanilla';

import {
    FACTORY_CONNECTION_DEFAULTS,
    resolvedHandshake,
    resolvedKeepalive,
    resolvedRetry,
    resolvedSocketio,
    resolvedWebsocket,
    type ConnectionDefaults,
} from './lib/connection-settings.js';

/** Where the defaults of the connections live: this app's own, beside its preferences. */
export const CONNECTION_DEFAULTS_STORAGE_KEY = 'mandor.async.connectionDefaults';

type ConnectionDefaultsState = {
    defaults: ConnectionDefaults;
};

type ConnectionDefaultsActions = {
    setDefaults: (defaults: ConnectionDefaults) => void;
};

type Parser<Value> = { safeParse: (value: unknown) => { data?: Value; success: boolean } };

function groupOf<Value>(schema: Parser<Value>, value: unknown): Value | undefined {
    const parsed = schema.safeParse(value);

    return parsed.success ? parsed.data : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * What was kept, group by group, read as a connection that saved those groups: each group the
 * domain no longer reads falls back to the factory alone, and a setting a later version adds
 * takes its factory value.
 */
function defaultsOf(value: unknown): ConnectionDefaults {
    const stored = isRecord(value) ? value : {};
    const saved = {
        handshake: groupOf(handshakeOptionsSchema, stored['handshake']),
        keepalive: groupOf(keepaliveOptionsSchema, stored['keepalive']),
        retry: groupOf(retryOptionsSchema, stored['retry']),
        socketio: groupOf(socketIoOptionsSchema, stored['socketio']),
        websocket: groupOf(websocketOptionsSchema, stored['websocket']),
    };
    const { maximumMessageSizeKiB, verifyCertificate } = resolvedWebsocket(saved);
    const socketio = resolvedSocketio(saved);

    return {
        handshake: resolvedHandshake(saved),
        keepalive: resolvedKeepalive(saved),
        retry: resolvedRetry(saved),
        socketio: {
            ackTimeoutMs: socketio.ackTimeoutMs,
            maximumMessageSizeKiB: socketio.maximumMessageSizeKiB,
        },
        websocket: { maximumMessageSizeKiB, verifyCertificate },
    };
}

/** The defaults of the connections as the app kept them, or the factory ones. */
export function readConnectionDefaults(): ConnectionDefaults {
    try {
        const stored = window.localStorage.getItem(CONNECTION_DEFAULTS_STORAGE_KEY);

        return defaultsOf(stored === null ? {} : (JSON.parse(stored) as unknown));
    } catch {
        return FACTORY_CONNECTION_DEFAULTS;
    }
}

function writeConnectionDefaults(defaults: ConnectionDefaults): void {
    try {
        window.localStorage.setItem(CONNECTION_DEFAULTS_STORAGE_KEY, JSON.stringify(defaults));
    } catch {
        // A storage that refuses keeps the defaults for this run: the next open still uses them.
    }
}

// store-scope: window — the defaults are the app's: every origin and workspace dials with them.
export const connectionDefaultsStore = createStore<
    ConnectionDefaultsActions & ConnectionDefaultsState
>()((set) => ({
    defaults: readConnectionDefaults(),
    setDefaults: (defaults) => {
        writeConnectionDefaults(defaults);
        set({ defaults });
    },
}));
