import {
    collectionFingerprint,
    collectionResourceOf,
    documentYamlOf,
    fingerprintOf,
} from '@mandor/interop-core';
import { workspaceBundleSchema, type WorkspaceBundle } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { parseMandorDocument } from '../../../src/mandor/document/parse-mandor-document.js';
import { documentsOf } from '../../../src/mandor/export/documents-of.js';
import { collectionResourcesOf } from '../../../src/mandor/import/collection-resources.js';
import { fixtureText } from '../support/sample-workspace.js';

function bundleWith(collections: unknown[]): WorkspaceBundle {
    return workspaceBundleSchema.parse({
        mandor: 'workspace',
        formatVersion: 1,
        app: 'sync',
        workspace: { name: 'Tienda' },
        collections,
    });
}

function item(name: string) {
    return { kind: 'request', name, body: {} };
}

describe('collectionResourcesOf', () => {
    const bundle = parseMandorDocument(fixtureText('sync-workspace.mandor.yaml'), 'sync');
    const resources = collectionResourcesOf(bundle, 'Tienda');

    it('lists the collection, then its folders, then their items, then the items at the top', () => {
        expect(resources.map(({ place, route }) => [place, route])).toEqual([
            ['collection', 'mascotas'],
            ['folder', 'mascotas/admin'],
            ['item', 'mascotas/admin/borrarmascota'],
            ['item', 'mascotas/listamascotas'],
        ]);
    });

    it('makes the collection as every other format does, with the auth it asks for', () => {
        const same = collectionResourceOf({
            name: 'Mascotas',
            description: 'Todo lo de las mascotas',
            auth: { type: 'none' },
            origin: { kind: 'mandor', sourceId: 'Tienda' },
        });

        expect(resources[0]).toEqual(same);
    });

    it('keeps the auth of a folder in its fields and the name in its fingerprint', () => {
        const auth = { type: 'basic', username: 'admin', password: '{{adminPassword}}' };

        expect(resources[1]).toMatchObject({ name: 'Admin', fields: { auth }, itemKind: null });
        expect(resources[1]?.origin.fingerprint).toBe(fingerprintOf({ name: 'Admin', auth }));
    });

    it('writes an item with the body it had, and the fingerprint the host reads it by', () => {
        const body = { method: 'GET', url: '{{baseUrl}}/pets', tags: ['lectura'] };

        expect(resources[3]).toMatchObject({
            itemKind: 'request',
            name: 'listaMascotas',
            fields: body,
            degradations: [],
        });
        expect(resources[3]?.origin).toEqual({
            kind: 'mandor',
            sourceId: 'Tienda',
            fingerprint: fingerprintOf({ name: 'listaMascotas', ...body }),
        });
    });

    it('hangs a folder from its parent, so two of one name in different branches stay apart', () => {
        const hondo = (name: string) => ({ name: 'Hondo', items: [item(name)] });
        const routes = collectionResourcesOf(
            bundleWith([
                {
                    name: 'Pets',
                    folders: [
                        { name: 'A', folders: [hondo('Uno')] },
                        { name: 'B', folders: [hondo('Dos')] },
                    ],
                },
            ]),
            'Tienda',
        ).map(({ route }) => route);

        expect(routes).toEqual([
            'pets',
            'pets/a',
            'pets/a/hondo',
            'pets/a/hondo/uno',
            'pets/b',
            'pets/b/hondo',
            'pets/b/hondo/dos',
        ]);
    });

    it('brings back the four settings of each of three levels, through a write and a read', () => {
        const settingsOf = (level: string) => ({
            description: `Doc de ${level}`,
            variables: [{ name: 'level', value: level, enabled: true, secret: false }],
            auth: { type: 'bearer', token: `{{${level}}}` } as const,
            headers: [{ key: 'X-Level', value: level, enabled: true }],
        });
        const [file] = documentsOf(
            {
                name: 'Tienda',
                connections: [],
                environments: [],
                globals: [],
                docs: [],
                collections: [
                    {
                        name: 'Uno',
                        settings: settingsOf('uno'),
                        items: [],
                        folders: [
                            {
                                name: 'Dos',
                                settings: settingsOf('dos'),
                                items: [],
                                folders: [
                                    {
                                        name: 'Tres',
                                        settings: settingsOf('tres'),
                                        items: [],
                                        folders: [],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            'sync',
        );
        const read = parseMandorDocument(documentYamlOf(file?.document), 'sync');
        const [uno, dos, tres] = collectionResourcesOf(read, 'Tienda');

        expect(uno?.fields).toEqual({ name: 'Uno', ...settingsOf('uno') });
        expect(uno?.origin.fingerprint).toBe(
            collectionFingerprint({ name: 'Uno', ...settingsOf('uno') }),
        );
        expect(dos?.fields).toEqual(settingsOf('dos'));
        expect(tres).toMatchObject({ route: 'uno/dos/tres', fields: settingsOf('tres') });
    });

    it('writes no key for what a folder does not declare', () => {
        const [, folder] = collectionResourcesOf(
            bundleWith([{ name: 'Pets', folders: [{ name: 'Admin' }] }]),
            'Tienda',
        );

        expect(folder?.fields).toEqual({});
    });

    it('gives two collections of one name two routes', () => {
        const routes = collectionResourcesOf(
            bundleWith([{ name: 'Pets' }, { name: 'Pets' }]),
            'Tienda',
        ).map(({ route }) => route);

        expect(routes).toEqual(['pets', 'pets-2']);
    });

    it('lets a folder keep its name when an item at the top asks for the same one', () => {
        const routes = collectionResourcesOf(
            bundleWith([
                {
                    name: 'Pets',
                    folders: [{ name: 'Admin' }],
                    items: [item('Admin'), item('Admin')],
                },
            ]),
            'Tienda',
        ).map(({ place, route }) => `${place}:${route}`);

        expect(routes).toEqual([
            'collection:pets',
            'folder:pets/admin',
            'item:pets/admin-2',
            'item:pets/admin-3',
        ]);
    });

    it('lets two folders each file an item of the same name', () => {
        const routes = collectionResourcesOf(
            bundleWith([
                {
                    name: 'Pets',
                    folders: [
                        { name: 'A', items: [item('List')] },
                        { name: 'B', items: [item('List')] },
                    ],
                },
            ]),
            'Tienda',
        )
            .filter(({ place }) => place === 'item')
            .map(({ route }) => route);

        expect(routes).toEqual(['pets/a/list', 'pets/b/list']);
    });

    it('keeps the tags of an item, and writes no key when it has none', () => {
        const tagged = { ...item('con'), tags: ['smoke'] };
        const resources = collectionResourcesOf(
            bundleWith([{ name: 'Pets', items: [tagged, item('sin')] }]),
            'Tienda',
        ).filter(({ place }) => place === 'item');

        expect(resources[0]?.fields).toEqual({ tags: ['smoke'] });
        expect(resources[1]?.fields).toEqual({});
    });

    it('keeps the arrangement of a level, parents first, and a folder claims its name first', () => {
        const resources = collectionResourcesOf(
            bundleWith([
                {
                    name: 'API',
                    sequence: ['item', 'folder', 'item'],
                    folders: [{ name: 'Uno', items: [item('Dentro')] }],
                    items: [item('Uno'), item('Dos')],
                },
            ]),
            'origen',
        );

        expect(resources.map(({ name, place }) => [place, name])).toEqual([
            ['collection', 'API'],
            ['item', 'Uno'],
            ['folder', 'Uno'],
            ['item', 'Dentro'],
            ['item', 'Dos'],
        ]);
        expect(resources[1]?.route).not.toBe(resources[2]?.route);
    });

    it('keeps the scripts of a collection, as it does those of a folder', () => {
        const script = { event: 'onResponse', dialect: 'postman', source: 'a();' };
        const [head] = collectionResourcesOf(
            bundleWith([{ name: 'Una', importedScripts: [script] }]),
            'Tienda',
        );

        expect(head?.fields['importedScripts']).toEqual([script]);
    });
});
