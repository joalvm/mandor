import type { Connection } from '@mandor/schema';

import type { InteropServer } from '../ir/interop-document.js';

/**
 * One connection, one server. The transport answers for the protocol: Socket.IO dials http(s)
 * and says `socket.io`, a websocket dials the scheme its url already carries.
 */
export function serverOfConnection(connection: Connection): InteropServer {
    return {
        name: connection.name,
        url: connection.url,
        protocol: protocolOf(connection.transport, connection.url),
        security: [],
        variables: {},
        extras: {},
    };
}

function protocolOf(transport: string, url: string): string {
    if (transport === 'socketio') {
        return 'socket.io';
    }

    return url.startsWith('wss:') ? 'wss' : 'ws';
}
