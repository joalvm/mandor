import type { WsOpenRequest } from '@mandor/ipc';
import { trimHeaderValue, type AuthParts } from '@mandor/vars';

import type { ConnectionTemplate } from './connection-effects.js';
import type { SocketOpenRequest } from './socket-manager.js';

/** The Socket.IO dial flattened for the port; the open of a websocket carries none of it. */
export function socketioFieldsOf(socketio: WsOpenRequest['socketio']): Partial<SocketOpenRequest> {
    if (socketio === undefined) {
        return {};
    }

    return {
        ...(socketio.namespace === undefined ? {} : { namespace: socketio.namespace }),
        ...(socketio.enginePath === undefined ? {} : { enginePath: socketio.enginePath }),
        ...(socketio.engineTransport === undefined
            ? {}
            : { engineTransport: socketio.engineTransport }),
        ...(socketio.auth === undefined ? {} : { auth: socketio.auth }),
        ...(socketio.version === undefined ? {} : { socketioVersion: socketio.version }),
    };
}

/** The fields of the open that pass through as the renderer resolved them, when it sent them. */
export function definedOf<Key extends keyof WsOpenRequest>(
    input: WsOpenRequest,
    keys: readonly Key[],
): Partial<Pick<WsOpenRequest, Key>> {
    const defined: Partial<Pick<WsOpenRequest, Key>> = {};

    for (const key of keys) {
        const value = input[key];

        if (value !== undefined) {
            defined[key] = value;
        }
    }

    return defined;
}

/** The auth of the handshake dials first: the subprotocols of the connection follow it. */
export function subprotocolsField(
    input: WsOpenRequest,
    parts: AuthParts,
): Partial<SocketOpenRequest> {
    const subprotocols = [...parts.subprotocols, ...(input.subprotocols ?? [])];

    return subprotocols.length === 0 ? {} : { subprotocols };
}

/** The header the template wrote wins over the one the auth would add, whatever the case. */
export function headersWithAuth(
    written: Record<string, string>,
    auth: readonly [string, string][],
): Record<string, string> {
    const writtenNames = new Set(Object.keys(written).map((name) => name.toLowerCase()));

    return Object.fromEntries([
        ...auth.filter(([name]) => !writtenNames.has(name.toLowerCase())),
        ...Object.entries(written),
    ]);
}

// jscpd:ignore-start — the renderer shows the url the main process dials and the two cannot
// import each other: each reads the same table of params on its own side.
/** The params the table says ride first; the query the auth produces rides after them. */
export function handshakeParams(
    values: Record<string, string>,
    template: ConnectionTemplate,
): [string, string][] {
    const pairs: [string, string][] = [];

    for (const [index, line] of (template.params ?? []).entries()) {
        if (!line.enabled || line.key === '') {
            continue;
        }

        const at = String(index);

        pairs.push([
            values[`param:${at}:key`] ?? line.key,
            values[`param:${at}:value`] ?? line.value,
        ]);
    }

    return pairs;
}
// jscpd:ignore-end

/** The query the auth produces rides on the resolved url, the way a browser appends it. */
export function urlWithAuthQuery(base: string, query: readonly [string, string][]): string {
    if (query.length === 0) {
        return base;
    }

    const parsed = new URL(base);

    for (const [name, value] of query) {
        parsed.searchParams.append(name, value);
    }

    return parsed.toString();
}

/** Every template of the handshake by key: `url`, `header:<name>`, `param:<i>:key|value`. */
export function templatesOf(template: ConnectionTemplate): Record<string, string> {
    const headers = Object.entries(template.headers ?? {}).map(
        ([name, value]): [string, string] => [`header:${name}`, value],
    );
    const params = (template.params ?? []).flatMap((line, index): [string, string][] => {
        const at = String(index);

        return [
            [`param:${at}:key`, line.key],
            [`param:${at}:value`, line.value],
        ];
    });

    return Object.fromEntries<string>([['url', template.url], ...headers, ...params]);
}

export function handshakeHeaders(values: Record<string, string>): Record<string, string> {
    return Object.fromEntries(
        Object.entries(values)
            .filter(([name]) => name.startsWith('header:'))
            .map(([name, value]) => [name.slice('header:'.length), trimHeaderValue(value)]),
    );
}
