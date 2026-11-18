import { degradation, type Degradation } from '../resource/degradation.js';
import {
    connectionUrlSchema,
    SUBPROTOCOL_PATTERN,
    urlMatchesTransport,
    type ConcreteAuth,
    type ItemOriginKind,
    type RequestLine,
} from '@mandor/schema';

import { fingerprintOf } from '../plan/fingerprint-of.js';
import type { ImportResource } from '../resource/import-resource.js';
import { definedOnly } from './resource-parts.js';

/** A WebSocket request as another app's document describes it, before it is a connection. */
export type ForeignWebsocket = {
    name: string;
    url: string;
    description: string;
    /** Every header the request lists, the ones switched off included. */
    headers: readonly RequestLine[];
    query: readonly RequestLine[];
    auth: ConcreteAuth | undefined;
    /** What the format could not carry whole, one line each. */
    degradations: readonly Degradation[];
};

/** Who the connection comes from and the id it takes on disk. */
export type ConnectionSource = { kind: ItemOriginKind; sourceId: string; route: string };

// Neither app has a field for the subprotocols, so both send them as this header.
const SUBPROTOCOL_HEADER = 'sec-websocket-protocol';
const MAX_SUBPROTOCOLS = 8;

function subprotocolsIn(value: string): string[] {
    const tokens = value
        .split(',')
        .map((token) => token.trim())
        .filter((token) => token !== '');
    const offerable =
        tokens.length > 0 &&
        tokens.length <= MAX_SUBPROTOCOLS &&
        tokens.every((token) => SUBPROTOCOL_PATTERN.test(token));

    return offerable ? tokens : [];
}

/** The subprotocol header lifted out when it holds protocols a handshake can offer; else it stays a header. */
function splitSubprotocols(lines: readonly RequestLine[]): {
    subprotocols: string[];
    rest: readonly RequestLine[];
} {
    const header = lines.find(
        (line) => line.enabled && line.key.toLowerCase() === SUBPROTOCOL_HEADER,
    );
    const subprotocols = subprotocolsIn(header?.value ?? '');

    return {
        subprotocols,
        rest: subprotocols.length === 0 ? lines : lines.filter((line) => line !== header),
    };
}

function nothingIf(empty: boolean, value: unknown): unknown {
    return empty ? undefined : value;
}

function urlProblems(url: string): Degradation[] {
    const dialable =
        connectionUrlSchema.safeParse(url).success && urlMatchesTransport('websocket', url);

    return dialable ? [] : [degradation('urlNotWebsocket', { url })];
}

/**
 * The connection a WebSocket request becomes: its address, headers (on and off), query, notes
 * and auth, with the subprotocol header read as the subprotocols of the handshake. A url Mandor
 * could not dial says so, because writing it would be refused.
 */
export function websocketConnectionOf(
    source: ForeignWebsocket,
    where: ConnectionSource,
): ImportResource {
    const { subprotocols, rest } = splitSubprotocols(source.headers);
    const fields = definedOnly({
        name: source.name,
        url: source.url,
        transport: 'websocket',
        // A line half typed is not a header; one switched off stays, switched off.
        headers: rest.filter((line) => line.key !== ''),
        params: nothingIf(source.query.length === 0, [...source.query]),
        description: nothingIf(source.description === '', source.description),
        auth: source.auth,
        websocket: nothingIf(subprotocols.length === 0, { subprotocols }),
    });

    return {
        place: 'connection',
        itemKind: null,
        route: where.route,
        name: source.name,
        fields,
        origin: { kind: where.kind, sourceId: where.sourceId, fingerprint: fingerprintOf(fields) },
        degradations: [...source.degradations, ...urlProblems(source.url)],
    };
}
