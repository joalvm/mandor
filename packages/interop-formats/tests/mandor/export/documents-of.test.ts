import { documentYamlOf } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { parseMandorDocument } from '../../../src/mandor/document/parse-mandor-document.js';
import { documentsOf } from '../../../src/mandor/export/documents-of.js';
import { readFiles } from '../../../src/mandor/import/read-files.js';
import { ASYNC_WORKSPACE, SECRET_VALUE, SYNC_WORKSPACE } from '../support/sample-workspace.js';

function textOfSync(): string {
    const [file] = documentsOf(SYNC_WORKSPACE, 'sync');

    return documentYamlOf(file?.document);
}

describe('documentsOf a workspace bundle', () => {
    it('writes one file named after the workspace', () => {
        const files = documentsOf(SYNC_WORKSPACE, 'sync');

        expect(files.map(({ path }) => path)).toEqual(['tienda-de-mascotas.mandor.yaml']);
    });

    it('opens with what says it is a workspace of the app that wrote it', () => {
        expect(textOfSync()).toMatch(
            /^mandor: workspace\nformatVersion: 2\napp: sync\nworkspace:\n/u,
        );
    });

    it('writes a secret empty and marked, and lets its value out nowhere', () => {
        const text = textOfSync();

        expect(text).not.toContain(SECRET_VALUE);
        expect(parseMandorDocument(text, 'sync').environments[0]?.variables[1]).toEqual({
            name: 'token',
            value: '',
            enabled: true,
            secret: true,
        });
    });

    it('writes the globals of the origin with a secret blank, and no key when there are none', () => {
        const [file] = documentsOf(
            {
                ...SYNC_WORKSPACE,
                globals: [
                    { name: 'zona', value: 'eu', enabled: true, secret: false },
                    { name: 'clave', value: SECRET_VALUE, enabled: true, secret: true },
                ],
            },
            'sync',
        );
        const text = documentYamlOf(file?.document);

        expect(text).not.toContain(SECRET_VALUE);
        expect(parseMandorDocument(text, 'sync').globals).toEqual([
            { name: 'zona', value: 'eu', enabled: true, secret: false },
            { name: 'clave', value: '', enabled: true, secret: true },
        ]);
        expect(
            documentYamlOf(documentsOf({ ...SYNC_WORKSPACE, globals: [] }, 'sync')[0]?.document),
        ).not.toContain('globals');
    });

    it('writes the same text for the same workspace, key by key', () => {
        expect(textOfSync()).toBe(textOfSync());
    });

    it('is read back by its own schema, what it holds the way it was', () => {
        const bundle = parseMandorDocument(textOfSync(), 'sync');
        const [collection] = bundle.collections;

        expect(bundle.workspace).toEqual({
            name: 'Tienda de Mascotas',
            auth: { type: 'bearer', token: '{{token}}' },
            variables: [],
        });
        expect(bundle.docs).toEqual(SYNC_WORKSPACE.docs);
        expect(collection?.description).toBe('Todo lo de las mascotas');
        expect(collection?.folders[0]?.items[0]?.body).toEqual({
            method: 'DELETE',
            url: '{{baseUrl}}/pets/1',
        });
        expect(collection?.items[0]).toEqual({
            kind: 'request',
            name: 'listaMascotas',
            tags: ['lectura'],
            body: { method: 'GET', url: '{{baseUrl}}/pets' },
        });
    });

    it('leaves out the keys that say nothing: no tags, no empty folders', () => {
        const [file] = documentsOf(ASYNC_WORKSPACE, 'async');
        const text = documentYamlOf(file?.document);

        expect(text).not.toContain('tags');
        expect(text).not.toContain('folders');
        expect(text).not.toContain('variables');
    });

    it('writes the connections of Realtime without the claim an import left on them', () => {
        const [file] = documentsOf(ASYNC_WORKSPACE, 'async');
        const text = documentYamlOf(file?.document);

        expect(text).toContain('wss://api.test/ws');
        expect(text).not.toContain('asyncapi');
        expect(text).not.toContain('origin');
    });

    it('writes no key for connections when the workspace has none', () => {
        expect(textOfSync()).not.toContain('connections');
    });

    it('comes back from the pipeline equal: write, read, and the workspace is the same', async () => {
        const [file] = documentsOf(SYNC_WORKSPACE, 'sync');
        const read = await readFiles(
            [{ path: file?.path ?? '', text: documentYamlOf(file?.document) }],
            'sync',
        );
        const items = read.resources.filter(({ place }) => place === 'item');

        expect(read.name).toBe(SYNC_WORKSPACE.name);
        expect(items.map(({ name, fields }) => [name, fields])).toEqual([
            ['borrarMascota', { method: 'DELETE', url: '{{baseUrl}}/pets/1' }],
            ['listaMascotas', { method: 'GET', url: '{{baseUrl}}/pets', tags: ['lectura'] }],
        ]);
        expect(read.resources.find(({ place }) => place === 'doc')?.fields).toEqual({
            text: SYNC_WORKSPACE.docs[0]?.text,
        });
    });

    it('says how a level mixes its folders and items, and says nothing when it does not', () => {
        const level = { settings: { variables: [], headers: [] }, folders: [], items: [] };
        const files = documentsOf(
            {
                name: 'W',
                connections: [],
                environments: [],
                globals: [],
                docs: [],
                collections: [
                    { name: 'Mezcla', ...level, sequence: ['item', 'folder'] },
                    { name: 'Lisa', ...level },
                ],
            },
            'sync',
        );
        const collections = (files[0]?.document as { collections: Record<string, unknown>[] })
            .collections;

        expect(collections[0]?.['sequence']).toEqual(['item', 'folder']);
        expect(collections[1]).not.toHaveProperty('sequence');
    });
});
