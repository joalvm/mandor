import { describe, expect, it } from 'vitest';

import { parsePostmanDocument } from '../../../src/postman/document/parse-postman-document.js';
import { collectionDocumentOf } from '../../../src/postman/export/workspace-to-collection.js';
import { MASCOTAS, SYNC_WORKSPACE, requestOf } from '../support/sample-workspace.js';

describe('workspace-to-collection: a collection of the workspace as one of Postman 2.1', () => {
    it('writes the name, the schema and the notes of the collection', () => {
        const document = collectionDocumentOf(MASCOTAS, SYNC_WORKSPACE);

        expect(document['info']).toEqual({
            name: 'Mascotas',
            schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
            description: 'Todo lo de las mascotas',
        });
    });

    it('lists the folders first, then the requests of the collection, without the messages', () => {
        const document = collectionDocumentOf(MASCOTAS, SYNC_WORKSPACE);
        const names = (document['item'] as { name: string }[]).map((item) => item.name);

        expect(names).toEqual(['Admin', 'listaMascotas']);
    });

    it('speaks the auth of the workspace when the collection speaks none', () => {
        expect(collectionDocumentOf(MASCOTAS, SYNC_WORKSPACE)).toHaveProperty(
            'auth.type',
            'bearer',
        );
        expect(
            collectionDocumentOf(
                {
                    ...MASCOTAS,
                    settings: {
                        variables: [],
                        auth: { type: 'basic', username: 'u', password: '{{p}}' },
                        headers: [],
                    },
                },
                SYNC_WORKSPACE,
            ),
        ).toHaveProperty('auth.type', 'basic');
    });

    it('does not copy the variables of the workspace into the collection', () => {
        const document = collectionDocumentOf(MASCOTAS, SYNC_WORKSPACE);

        expect(SYNC_WORKSPACE.globals.length).toBeGreaterThan(0);
        expect(document).not.toHaveProperty('variable');
    });

    it('writes no auth when neither the workspace nor the collection has one', () => {
        const document = collectionDocumentOf(
            {
                name: 'Sola',
                settings: { variables: [], headers: [] },
                folders: [],
                items: [requestOf('uno')],
            },
            { auth: undefined },
        );

        expect(document).not.toHaveProperty('auth');
        expect(document).not.toHaveProperty('variable');
        expect(document['info']).not.toHaveProperty('description');
    });

    it('is a collection that Postman, and this app, read back', () => {
        const text = JSON.stringify(collectionDocumentOf(MASCOTAS, SYNC_WORKSPACE));

        expect(parsePostmanDocument(text).kind).toBe('collection');
    });

    it('writes the variables of the collection and its headers on each request', () => {
        const document = collectionDocumentOf(
            {
                name: 'Tienda',
                settings: {
                    description: 'En info',
                    variables: [{ name: 'a', value: '1', enabled: true, secret: false }],
                    headers: [{ key: 'X-A', value: '1', enabled: true }],
                },
                folders: [
                    {
                        name: 'B',
                        settings: { variables: [], headers: [] },
                        folders: [],
                        items: [requestOf('honda')],
                    },
                ],
                items: [requestOf('suelta')],
            },
            {},
        );
        const [folder, loose] = document['item'] as {
            item?: { request: { header: unknown } }[];
            request?: { header: unknown };
        }[];

        expect(document).not.toHaveProperty('description');
        expect(document['variable']).toEqual([{ key: 'a', value: '1', type: 'string' }]);
        expect(folder?.item?.[0]?.request.header).toEqual([{ key: 'X-A', value: '1' }]);
        expect(loose?.request?.header).toEqual([{ key: 'X-A', value: '1' }]);
    });

    it('lists what a level holds as the person arranged it', () => {
        const settings = { variables: [], headers: [] };
        const request = { kind: 'request', name: 'r', tags: [], body: { method: 'GET', url: 'u' } };
        const document = collectionDocumentOf(
            {
                name: 'API',
                settings,
                folders: [{ name: 'F', settings, folders: [], items: [] }],
                items: [request],
                sequence: ['item', 'folder'],
            },
            { auth: undefined },
        );

        expect(document['item']).toMatchObject([{ name: 'r' }, { name: 'F' }]);
    });
});
