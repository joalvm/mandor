import { readFileSync } from 'node:fs';

import type { WorkspaceData } from '@mandor/interop-core';
import type { CollectionItem } from '@mandor/schema';

/** The value of a secret in the sample: no file the format writes may carry it. */
export const SECRET_VALUE = 'hunter2-must-not-leave';

/** The text of a file in `tests/mandor/fixtures`, as the user would drop it. */
export function fixtureText(name: string): string {
    return readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8');
}

const LIST_PETS: CollectionItem = {
    kind: 'request',
    name: 'listaMascotas',
    tags: ['lectura'],
    body: { method: 'GET', url: '{{baseUrl}}/pets' },
};

const DELETE_PET: CollectionItem = {
    kind: 'request',
    name: 'borrarMascota',
    tags: [],
    body: { method: 'DELETE', url: '{{baseUrl}}/pets/1' },
};

/** A workspace of Request with a little of everything the bundle carries. */
export const SYNC_WORKSPACE: WorkspaceData = {
    name: 'Tienda de Mascotas',
    connections: [],
    environments: [
        {
            id: 'prod',
            name: 'Prod',
            variables: [
                { name: 'baseUrl', value: 'https://api.test', enabled: true, secret: false },
                { name: 'token', value: SECRET_VALUE, enabled: true, secret: true },
            ],
        },
    ],
    auth: { type: 'bearer', token: '{{token}}' },
    globals: [{ name: 'region', value: 'eu', enabled: true, secret: false }],
    docs: [{ name: 'leeme.md', title: 'Leeme', text: '# Tienda\n\nNotas de la tienda.\n' }],
    collections: [
        {
            name: 'Mascotas',
            settings: {
                description: 'Todo lo de las mascotas',
                variables: [],
                auth: { type: 'none' },
                headers: [],
            },
            folders: [
                {
                    name: 'Admin',
                    settings: {
                        variables: [],
                        auth: { type: 'basic', username: 'admin', password: '{{adminPassword}}' },
                        headers: [],
                    },
                    folders: [],
                    items: [DELETE_PET],
                },
            ],
            items: [LIST_PETS],
        },
    ],
};

/** A workspace of Realtime: a message for the collection and a connection beside it. */
export const ASYNC_WORKSPACE: WorkspaceData = {
    name: 'Pasarela de Pedidos',
    connections: [
        {
            id: 'pedidos',
            name: 'Pedidos',
            transport: 'websocket',
            url: 'wss://api.test/ws',
            headers: [],
            environmentId: null,
            origin: { kind: 'asyncapi', sourceId: 'pasarela' },
        },
    ],
    environments: [],
    globals: [],
    docs: [],
    collections: [
        {
            name: 'Pedidos',
            settings: { variables: [], headers: [] },
            folders: [],
            items: [
                {
                    kind: 'message',
                    name: 'registrarPedido',
                    tags: [],
                    body: {
                        channel: 'pedidos',
                        direction: 'outgoing',
                        payload: '{}',
                        payloadType: 'json',
                    },
                },
            ],
        },
    ],
};
