import {
    distinct,
    pathParamsOf,
    websocketConnectionOf,
    type ImportResource,
} from '@mandor/interop-core';
import type { RequestLine } from '@mandor/schema';

import type { InsomniaRow, InsomniaWebSocket } from '../document/insomnia-tree.js';
import { authOf } from './auth-of.js';
import { withTemplates } from './template-of.js';

function linesOf(rows: readonly InsomniaRow[]): RequestLine[] {
    return rows.map((row) => ({ key: row.name, value: row.value, enabled: !row.disabled }));
}

/**
 * Insomnia keeps a path parameter's value apart and sends it in the url; a connection has no
 * place for one, so the value goes where the name was.
 */
function dialedUrlOf(socket: InsomniaWebSocket): string {
    const named = pathParamsOf(socket.url, socket.pathParameters);

    return named.lines.reduce(
        (url, line) => url.replaceAll(`{${line.key}}`, line.value),
        named.url,
    );
}

/**
 * One WebSocket request of the collection as a connection of the workspace: the address with its
 * path parameters filled in, the headers and the query in their rows, the notes and its own auth.
 * Insomnia keeps no saved messages for it, so none enter. `route` is the id the connection takes,
 * and the name is the one it is called by.
 */
export function websocketResourceOf(
    socket: InsomniaWebSocket,
    sourceId: string,
    route: string,
): ImportResource {
    const auth = authOf(socket.authentication, 'request');
    const mapped = withTemplates({
        url: dialedUrlOf(socket),
        headers: linesOf(socket.headers),
        query: linesOf(socket.parameters),
        description: socket.description,
        auth: auth.auth,
    });

    return websocketConnectionOf(
        {
            ...mapped.value,
            name: socket.name,
            degradations: distinct([...auth.degradations, ...mapped.notes]),
        },
        { kind: 'insomnia', sourceId, route },
    );
}
