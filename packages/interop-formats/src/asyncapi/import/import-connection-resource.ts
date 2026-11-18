import {
    degradation,
    type Degradation,
    fingerprintOf,
    type ImportResource,
    type InteropServer,
    isRecord,
} from '@mandor/interop-core';
import { slugify, type ConnectionTransport } from '@mandor/schema';

const SOCKETIO_PROTOCOLS = new Set(['socket.io', 'socketio']);

/**
 * The connection one server becomes. The protocol chooses the transport — and the url has to
 * speak that transport's scheme, because Socket.IO dials http(s) while a websocket dials
 * ws(s). A protocol Mandor cannot dial yet still enters, as websocket, saying so: dropping
 * the endpoint would be dropping the service's front door.
 */
export function connectionResourceOf(server: InteropServer, sourceId: string): ImportResource {
    const socketio = SOCKETIO_PROTOCOLS.has(server.protocol) || declaresSocketIo(server);
    const transport: ConnectionTransport = socketio ? 'socketio' : 'websocket';
    const url = socketio ? httpUrlOf(server.url) : server.url;
    const owned = { name: server.name, url, transport, headers: [] };

    return {
        place: 'connection',
        itemKind: null,
        // The route is the id the connection will take on disk: the same server name meets
        // the same file again on a re-import, which is what makes the second pass an update.
        route: slugify(server.name),
        name: server.name,
        fields: { ...owned, ...server.extras },
        origin: { kind: 'asyncapi', sourceId, fingerprint: fingerprintOf(owned) },
        degradations: degradationsOf(server, socketio),
    };
}

function degradationsOf(server: InteropServer, socketio: boolean): Degradation[] {
    const reasons: Degradation[] = [];

    if (!socketio && server.protocol !== 'ws' && server.protocol !== 'wss') {
        reasons.push(degradation('protocolAsWebsocket', { protocol: server.protocol }));
    }

    return reasons;
}

function declaresSocketIo(server: InteropServer): boolean {
    const bindings = server.extras['bindings'];

    if (!isRecord(bindings)) {
        return false;
    }

    const ws = bindings['ws'];

    return isRecord(ws) && ws['x-socketio'] === true;
}

function httpUrlOf(url: string): string {
    if (url.startsWith('wss://')) {
        return `https://${url.slice('wss://'.length)}`;
    }

    if (url.startsWith('ws://')) {
        return `http://${url.slice('ws://'.length)}`;
    }

    return url;
}
