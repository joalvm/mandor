import type { ItemOrigin } from '../collection/item-origin.js';
import type { RequestLine } from '../request/request-line.js';
import type { Connection } from './connection.js';
import type { ConnectionExtras } from './connection-extras.js';
import { DEFAULT_CONNECTION_TRANSPORT, type ConnectionTransport } from './connection-transport.js';
import { parseConnection } from './parse-connection.js';

export type CreateConnectionInput = {
    /** The opaque id the caller minted; it names the file and never follows the name. */
    id: string;
    name: string;
    url: string;
    /** Absent means the transport every connection starts as. */
    transport?: ConnectionTransport;
    headers?: readonly RequestLine[];
    environmentId?: string | null;
    origin?: ItemOrigin | undefined;
} & Omit<ConnectionExtras, 'headers'>;

/** Creates a connection; the environment stays unset until the user picks one. */
export function createConnection({
    id,
    name,
    url,
    transport,
    headers,
    environmentId,
    origin,
    ...extras
}: CreateConnectionInput): Connection {
    const connection = {
        id,
        name,
        transport: transport ?? DEFAULT_CONNECTION_TRANSPORT,
        url,
        headers: headers ?? [],
        environmentId: environmentId ?? null,
        ...extras,
        ...(origin === undefined ? {} : { origin }),
    };

    return parseConnection(connection);
}
