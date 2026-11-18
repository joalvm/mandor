import { describe, expect, it } from 'vitest';

import { insomniaIdOf } from '../../../src/insomnia/export/insomnia-id.js';
import { collectionDocumentOf } from '../../../src/insomnia/export/workspace-to-v5.js';
import {
    EVENTS,
    LOBBY,
    MASCOTAS,
    PROD,
    SYNC_WORKSPACE,
    requestOf,
} from '../support/sample-workspace.js';

const NOTHING = { connections: [], environments: [], globals: [] } as const;

function namesOf(items: unknown): unknown[] {
    return (items as Record<string, unknown>[]).map((item) => item['name']);
}

describe('collectionDocumentOf', () => {
    it('writes the head of a collection of Insomnia 5 with an id drawn from its name', () => {
        const document = collectionDocumentOf(MASCOTAS, SYNC_WORKSPACE);

        expect(document).toMatchObject({
            type: 'collection.insomnia.rest/5.0',
            schema_version: '5.1',
            name: 'Mascotas',
            meta: { id: insomniaIdOf('wrk', 'Mascotas'), description: 'Todo lo de las mascotas' },
        });
    });

    it('writes the folders first and then the requests, leaving the messages out', () => {
        const document = collectionDocumentOf(MASCOTAS, SYNC_WORKSPACE);

        expect(namesOf(document['collection'])).toEqual(['Admin', 'listaMascotas']);
    });

    it('carries the environments of the workspace', () => {
        const document = collectionDocumentOf(MASCOTAS, SYNC_WORKSPACE);

        expect(document['environments']).toMatchObject({
            name: 'Base Environment',
            data: { region: 'eu' },
            subEnvironments: [{ name: 'Prod' }],
        });
    });

    it('writes no description and no environments when the workspace has none', () => {
        const document = collectionDocumentOf(
            { name: 'Sola', settings: { variables: [], headers: [] }, folders: [], items: [] },
            NOTHING,
        );

        expect(document['meta']).toEqual({ id: insomniaIdOf('wrk', 'Sola') });
        expect(document).not.toHaveProperty('environments');
        expect(document['collection']).toEqual([]);
    });

    it('speaks the auth of the workspace where nothing nearer speaks one', () => {
        const document = collectionDocumentOf(MASCOTAS, SYNC_WORKSPACE);
        const [admin, lista] = document['collection'] as Record<string, unknown>[];

        expect(admin?.['authentication']).toMatchObject({ type: 'basic', username: 'admin' });
        expect(lista?.['authentication']).toEqual({ type: 'bearer', token: '{{ _.token }}' });
    });

    it('prefers the auth of the collection to the one of the workspace', () => {
        const document = collectionDocumentOf(
            {
                name: 'Sola',
                settings: {
                    variables: [],
                    auth: { type: 'basic', username: 'ana', password: '' },
                    headers: [],
                },
                folders: [],
                items: [requestOf('uno')],
            },
            { ...NOTHING, auth: { type: 'bearer', token: '{{token}}' } },
        );
        const [uno] = document['collection'] as Record<string, unknown>[];

        expect(uno?.['authentication']).toMatchObject({ type: 'basic', username: 'ana' });
    });

    it('writes a collection with environments and no workspace auth', () => {
        const document = collectionDocumentOf(
            {
                name: 'Sola',
                settings: { variables: [], headers: [] },
                folders: [],
                items: [requestOf('uno')],
            },
            { ...NOTHING, environments: [PROD] },
        );
        const [uno] = document['collection'] as Record<string, unknown>[];

        expect(uno).not.toHaveProperty('authentication');
        expect(document).toHaveProperty('environments');
    });

    it('takes the headers of the collection down to the first level and the loose requests', () => {
        const document = collectionDocumentOf(
            {
                name: 'Sola',
                settings: {
                    variables: [],
                    headers: [
                        { key: 'X-Todos', value: '1', enabled: true },
                        { key: 'X-Pisada', value: 'colección', enabled: true },
                    ],
                },
                folders: [
                    {
                        name: 'Arriba',
                        settings: {
                            variables: [],
                            headers: [{ key: 'X-Pisada', value: 'carpeta', enabled: true }],
                        },
                        folders: [],
                        items: [],
                    },
                ],
                items: [requestOf('uno')],
            },
            NOTHING,
        );
        const [arriba, uno] = document['collection'] as Record<string, unknown>[];

        expect(arriba?.['headers']).toEqual([
            { name: 'X-Todos', value: '1' },
            { name: 'X-Pisada', value: 'carpeta' },
        ]);
        expect(uno?.['headers']).toEqual([
            { name: 'X-Todos', value: '1' },
            { name: 'X-Pisada', value: 'colección' },
        ]);
    });

    it('melts the variables of the collection and the globals in the base: the collection wins', () => {
        const document = collectionDocumentOf(
            {
                name: 'Sola',
                settings: {
                    variables: [{ name: 'zona', value: 'sur', enabled: true, secret: false }],
                    headers: [],
                },
                folders: [],
                items: [],
            },
            {
                ...NOTHING,
                globals: [
                    { name: 'zona', value: 'norte', enabled: true, secret: false },
                    { name: 'host', value: 'x', enabled: true, secret: false },
                ],
            },
        );

        expect(document['environments']).toMatchObject({ data: { zona: 'sur', host: 'x' } });
    });

    it('writes the WebSocket connections after the requests, and not the Socket.IO ones', () => {
        const document = collectionDocumentOf(MASCOTAS, {
            ...SYNC_WORKSPACE,
            connections: [LOBBY, EVENTS],
        });

        expect(namesOf(document['collection'])).toEqual(['Admin', 'listaMascotas', 'Lobby']);
    });

    it('lets a connection with no auth of its own speak the auth of the workspace, not the collection', () => {
        const document = collectionDocumentOf(
            {
                ...MASCOTAS,
                settings: {
                    variables: [],
                    auth: { type: 'basic', username: 'ana', password: '' },
                    headers: [],
                },
            },
            { ...SYNC_WORKSPACE, connections: [{ ...LOBBY, auth: undefined }] },
        );
        const socket = (document['collection'] as Record<string, unknown>[]).at(-1);

        expect(socket?.['authentication']).toEqual({ type: 'bearer', token: '{{ _.token }}' });
    });

    it('lists what a level holds as the person arranged it', () => {
        const settings = { variables: [], headers: [] };
        const request = { kind: 'request', name: 'r', tags: [], body: { method: 'GET', url: 'u' } };
        const document = collectionDocumentOf(
            {
                name: 'API',
                settings,
                folders: [
                    {
                        name: 'F',
                        settings,
                        folders: [{ name: 'G', settings, folders: [], items: [] }],
                        items: [request],
                        sequence: ['item', 'folder'],
                    },
                ],
                items: [request],
                sequence: ['item', 'folder'],
            },
            { auth: undefined, ...NOTHING },
        );

        expect(namesOf(document['collection'])).toEqual(['r', 'F']);
        expect(document['collection']).toMatchObject([
            {},
            { children: [{ name: 'r' }, { name: 'G' }] },
        ]);
    });
});
