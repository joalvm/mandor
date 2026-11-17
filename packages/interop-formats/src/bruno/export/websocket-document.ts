import {
    concreteAuthOf,
    listedRows,
    websocketHeaderRows,
    type FormatDocument,
} from '@mandor/interop-core';
import type { ConcreteAuth, Connection } from '@mandor/schema';

import { authEntryOf } from './auth-document.js';
import { urlWithQuery } from './url-with-query.js';

type SocketPlace = {
    /** Where the connection stands among what its directory holds: Bruno lists by this number. */
    seq: number;
    /** The auth it answers to when it has none of its own: the workspace's. */
    inherited: ConcreteAuth | undefined;
    /** What it keeps saved to send, as the variants Bruno lists. */
    messages?: readonly FormatDocument[] | undefined;
};

/**
 * One WebSocket connection as the item Bruno lists beside the requests. It has no field for the
 * subprotocols, so they leave in the header the handshake carries them in. The messages it has
 * sent are not part of it; the ones saved to send are. A query parameter that is off has no place:
 * Bruno keeps the query in the url here.
 */
export function websocketDocumentOf(
    connection: Connection,
    { seq, inherited, messages = [] }: SocketPlace,
): FormatDocument {
    const auth = concreteAuthOf(connection.auth) ?? inherited;

    return {
        info: { name: connection.name, type: 'websocket', seq },
        websocket: {
            url: urlWithQuery(connection.url, connection.params ?? []),
            ...listedRows('headers', websocketHeaderRows(connection)),
            ...(messages.length === 0 ? {} : { message: messages }),
            ...authEntryOf(auth),
        },
        ...(connection.description === undefined ? {} : { docs: connection.description }),
    };
}
