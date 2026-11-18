import type { WorkspaceCollectionSource, WorkspaceData } from '@mandor/interop-core';
import type { CollectionItem, Connection, Environment } from '@mandor/schema';

/** The value of a secret in the samples: no file Insomnia gets may carry it. */
export const SECRET_VALUE = 'hunter2-must-not-leave';

/** A request of the collection with what it says, and the rest the way the schema defaults it. */
export function requestOf(name: string, body: Record<string, unknown> = {}): CollectionItem {
    return {
        kind: 'request',
        name,
        tags: [],
        body: { method: 'GET', url: '{{baseUrl}}/pets', ...body },
    };
}

export const MESSAGE: CollectionItem = {
    kind: 'message',
    name: 'registrarPedido',
    tags: [],
    body: { channel: 'pedidos', direction: 'outgoing', payload: '' },
};

export const PROD: Environment = {
    id: 'prod',
    name: 'Prod',
    variables: [
        { name: 'baseUrl', value: 'https://api.test', enabled: true, secret: false },
        { name: 'token', value: SECRET_VALUE, enabled: true, secret: true },
        { name: 'off', value: 'x', enabled: false, secret: false },
    ],
};

export const MASCOTAS: WorkspaceCollectionSource = {
    name: 'Mascotas',
    settings: { description: 'Todo lo de las mascotas', variables: [], headers: [] },
    folders: [
        {
            name: 'Admin',
            settings: {
                variables: [],
                auth: { type: 'basic', username: 'admin', password: '{{adminPassword}}' },
                headers: [],
            },
            folders: [],
            items: [requestOf('borrarMascota', { method: 'DELETE' })],
        },
    ],
    items: [requestOf('listaMascotas'), MESSAGE],
};

/** A workspace of Request with a little of everything the files of Insomnia carry. */
export const SYNC_WORKSPACE: WorkspaceData = {
    name: 'Tienda de Mascotas',
    connections: [],
    environments: [PROD],
    auth: { type: 'bearer', token: '{{token}}' },
    globals: [{ name: 'region', value: 'eu', enabled: true, secret: false }],
    docs: [{ name: 'leeme.md', title: 'Leeme', text: '# Tienda\n' }],
    collections: [MASCOTAS],
};

/** A WebSocket connection of Realtime with the things a handshake can carry. */
export const LOBBY: Connection = {
    id: 'lobby',
    name: 'Lobby',
    transport: 'websocket',
    url: 'wss://{{host}}/lobby',
    headers: [
        { key: 'x-room', value: '7', enabled: true },
        { key: 'x-off', value: '1', enabled: false },
    ],
    params: [{ key: 'room', value: '1', enabled: true }],
    environmentId: null,
    description: 'The public room',
    websocket: { subprotocols: ['chat', 'superchat'] },
    auth: { type: 'bearer', token: '{{token}}' },
};

/** A Socket.IO connection, which Insomnia keeps in a request of its own kind. */
export const EVENTS: Connection = {
    id: 'events',
    name: 'Events',
    transport: 'socketio',
    url: 'https://events.test',
    headers: [],
    environmentId: null,
};
