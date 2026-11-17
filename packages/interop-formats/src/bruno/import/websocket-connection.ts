import { distinct, websocketConnectionOf, type ImportResource } from '@mandor/interop-core';

import type { BrunoWebSocket } from '../document/bruno-tree.js';
import { authOf } from './auth-of.js';
import { leftOutText } from './left-out-text.js';
import { linesOf } from './request-lines.js';

/**
 * One WebSocket request of the collection as a connection of the workspace: the address, with
 * the query inside as Bruno writes it, the headers, the notes and its own auth. The messages the
 * request keeps saved do not travel with it: they are messages of the collection. `route` is the
 * id the connection takes, and the name is the one it is called by.
 */
export function websocketResourceOf(
    socket: BrunoWebSocket,
    sourceId: string,
    route: string,
): ImportResource {
    const auth = authOf(socket.auth, 'request');

    return websocketConnectionOf(
        {
            name: socket.name,
            url: socket.url,
            description: socket.description,
            headers: linesOf(socket.headers),
            query: [],
            auth: auth.auth,
            degradations: distinct([
                ...auth.degradations,
                ...leftOutText('request', socket.leftOut),
            ]),
        },
        { kind: 'bruno', sourceId, route },
    );
}
