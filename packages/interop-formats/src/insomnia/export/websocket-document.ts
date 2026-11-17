import {
    concreteAuthOf,
    listedRows,
    namedRowsOf,
    websocketHeaderRows,
    type FormatDocument,
} from '@mandor/interop-core';
import type { ConcreteAuth, Connection } from '@mandor/schema';

import { authDocumentOf } from './auth-document.js';
import { insomniaIdOf } from './insomnia-id.js';
import { withReferences } from './reference-of.js';

/**
 * One WebSocket connection as the item Insomnia lists beside the requests. It has no field for
 * the subprotocols, so they leave in the header the handshake carries them in. `inherited` is
 * the auth it answers to when it has none of its own: the workspace's, which the collection of
 * Insomnia cannot say. The messages a connection has sent are not part of it.
 */
export function websocketDocumentOf(
    connection: Connection,
    inherited: ConcreteAuth | undefined,
): FormatDocument {
    const auth = concreteAuthOf(connection.auth) ?? inherited;
    const content: FormatDocument = {
        url: connection.url,
        name: connection.name,
        meta: {
            id: insomniaIdOf('ws-req', connection.id),
            ...(connection.description === undefined
                ? {}
                : { description: connection.description }),
        },
        ...listedRows('parameters', namedRowsOf(connection.params ?? [])),
        ...listedRows('headers', websocketHeaderRows(connection)),
        ...(auth === undefined ? {} : { authentication: authDocumentOf(auth) }),
    };

    return withReferences(content);
}
