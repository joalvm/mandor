import type { Connection } from '@mandor/schema';

import { namedRowsOf, type NamedRow } from './named-rows-of.js';

/** The header both Insomnia and Bruno send the subprotocols in, having no field of their own. */
export const SUBPROTOCOL_HEADER = 'Sec-WebSocket-Protocol';

/**
 * The headers of the handshake as a document lists them: the ones that are sent, then the
 * subprotocols the connection offers as the one header the handshake carries them in, then the
 * ones switched off.
 */
export function websocketHeaderRows(
    connection: Pick<Connection, 'headers' | 'websocket'>,
): NamedRow[] {
    const protocols = connection.websocket?.subprotocols ?? [];
    const sent = namedRowsOf(connection.headers.filter((line) => line.enabled));
    const offered =
        protocols.length === 0 ? [] : [{ name: SUBPROTOCOL_HEADER, value: protocols.join(', ') }];
    const off = namedRowsOf(connection.headers.filter((line) => !line.enabled));

    return [...sent, ...offered, ...off];
}
