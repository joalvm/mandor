import type { AsyncAPIDocumentInterface } from '@asyncapi/parser';
import { type InteropSecurityScheme, type InteropServer, isRecord } from '@mandor/interop-core';

import { securityNamesOf } from './map-security.js';
import { unknownKeys } from '../document/unknown-keys.js';

const KNOWN = [
    'url',
    'host',
    'pathname',
    'protocol',
    'protocolVersion',
    'security',
    'variables',
    'description',
];

/**
 * One connection per server the document offers. The bindings of the server are deliberately
 * *not* known keys: they ride in `extras`, because what they say — query, headers, handshake —
 * is a decision for the writer of the connection, not for this mapping.
 */
export function serversOf(
    document: AsyncAPIDocumentInterface,
    raw: Record<string, unknown>,
    schemes: Record<string, InteropSecurityScheme>,
): InteropServer[] {
    return document
        .servers()
        .all()
        .map((server) => {
            const rawServer = rawNamed(raw, 'servers', server.id());

            return {
                name: server.id(),
                url: server.url(),
                protocol: server.protocol(),
                security: securityNamesOf(rawServer?.['security'], schemes),
                variables: {},
                extras: rawServer === undefined ? {} : unknownKeys(rawServer, KNOWN),
            };
        });
}

/** The raw form of a named thing — servers and channels keep their document spelling there. */
export function rawNamed(
    raw: Record<string, unknown>,
    kind: string,
    name: string | undefined,
): Record<string, unknown> | undefined {
    const group = raw[kind];

    if (!isRecord(group) || name === undefined) {
        return undefined;
    }

    const entry = group[name];

    return isRecord(entry) ? entry : undefined;
}
