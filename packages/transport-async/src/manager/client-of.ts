import type { AsyncClient, AsyncClientEvents } from '../client/async-client.js';
import type { WsClientOptions } from '../client/dial-options-of.js';
import { SocketIoClient, type SocketIoClientOptions } from '../client/socketio-client.js';
import { WsClient } from '../client/ws-client.js';
import type { OpenConnectionRequest, SocketTransport } from './connection-requests.js';

type ClientFactory = (request: OpenConnectionRequest, events: AsyncClientEvents) => AsyncClient;

/** The client each transport dials with, keyed by the transport that owns it. */
const CLIENTS: Record<SocketTransport, ClientFactory> = {
    socketio: (request, events) =>
        new SocketIoClient(request.url, events, socketIoOptionsOf(request)),
    websocket: (request, events) => new WsClient(request.url, events, toClientOptions(request)),
};

/** The options a Socket.IO client dials with, read off the open request. */
function socketIoOptionsOf(request: OpenConnectionRequest): SocketIoClientOptions {
    const { auth, enginePath, engineTransport, namespace, verifyCertificate, headers } = request;

    return {
        auth,
        enginePath,
        engineTransport,
        namespace,
        verifyCertificate,
        headers,
        version: request.socketioVersion,
        maximumPayloadBytes: request.maximumMessageSizeBytes,
        ...networkOf(request),
    };
}

/** What every transport dials the network with: the wait, the trust and the way out. */
function networkOf(
    request: OpenConnectionRequest,
): Pick<OpenConnectionRequest, 'handshakeTimeoutMs' | 'proxy' | 'tls'> {
    const { handshakeTimeoutMs, proxy, tls } = request;

    return { handshakeTimeoutMs, proxy, tls };
}

/** The options a websocket client dials with, read off the open request. */
function toClientOptions(request: OpenConnectionRequest): WsClientOptions {
    return {
        headers: request.headers,
        keepalive: request.keepalive,
        maximumPayloadBytes: request.maximumMessageSizeBytes,
        subprotocols: request.subprotocols,
        verifyCertificate: request.verifyCertificate,
        ...networkOf(request),
    };
}

/** The client the transport of the request dials with, reporting to `events`. */
export function clientOf(request: OpenConnectionRequest, events: AsyncClientEvents): AsyncClient {
    return CLIENTS[request.transport](request, events);
}
