import type { ImportResource, InteropFile } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { readFiles } from '../../../src/postman/import/read-files.js';
import { fixtureText } from '../support/fixture.js';

const SCHEMA = 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json';

function collectionFile(name: string, auth: unknown): InteropFile {
    return {
        path: `${name}.json`,
        text: JSON.stringify({ info: { name, schema: SCHEMA }, auth, item: [] }),
    };
}

function bearer(token: string): unknown {
    return { type: 'bearer', bearer: [{ key: 'token', value: token, type: 'string' }] };
}

function collectionsOf(resources: readonly ImportResource[]): ImportResource[] {
    return resources.filter((resource) => resource.place === 'collection');
}

describe('reading several Postman collections that ask for an auth each', () => {
    it('gives every collection its own auth', async () => {
        const read = await readFiles([
            collectionFile('Pagos', bearer('{{pagos}}')),
            collectionFile('Envios', {
                type: 'basic',
                basic: [{ key: 'username', value: 'ana', type: 'string' }],
            }),
        ]);
        const [pagos, envios] = collectionsOf(read.resources);

        expect(pagos?.fields['auth']).toEqual({ type: 'bearer', token: '{{pagos}}' });
        expect(envios?.fields['auth']).toMatchObject({ type: 'basic', username: 'ana' });
    });

    it('covers the auth in the fingerprint the collection is claimed with', async () => {
        const read = await readFiles([
            collectionFile('Pagos', bearer('{{a}}')),
            collectionFile('Envios', bearer('{{b}}')),
        ]);
        const [first, second] = collectionsOf(read.resources);

        expect(first?.origin.fingerprint).not.toBe(second?.origin.fingerprint);
    });

    it('puts the auth of no collection on the workspace', async () => {
        const read = await readFiles([
            collectionFile('Pagos', bearer('{{pagos}}')),
            collectionFile('Envios', bearer('{{envios}}')),
        ]);
        const workspaces = read.resources.filter((resource) => resource.place === 'workspace');

        expect(workspaces.every((workspace) => !('auth' in workspace.fields))).toBe(true);
    });

    it('writes no workspace for one collection with an auth and nothing else', async () => {
        const read = await readFiles([collectionFile('Pagos', bearer('{{pagos}}'))]);

        expect(read.resources.map((resource) => resource.place)).toEqual(['collection']);
    });

    it('keeps the auth of the collection as it came', async () => {
        const read = await readFiles([
            collectionFile('Pagos', {
                type: 'bearer',
                bearer: [{ key: 'token', value: 'abc', type: 'string' }],
            }),
        ]);
        const [collection] = collectionsOf(read.resources);

        expect(collection?.fields['auth']).toEqual({ type: 'bearer', token: 'abc' });
        expect(collection?.degradations).toEqual([]);
    });

    it('leaves a collection that asks for no auth with none to write', async () => {
        const read = await readFiles([collectionFile('Libre', undefined)]);
        const [collection] = collectionsOf(read.resources);

        expect(collection?.fields).not.toHaveProperty('auth');
    });

    it('keeps the globals as the globals of the origin next to collections with an auth', async () => {
        const globals: InteropFile = { path: 'g.json', text: fixtureText('globals.json') };
        const read = await readFiles([collectionFile('Pagos', bearer('{{p}}')), globals]);
        const shared = read.resources.find((resource) => resource.place === 'globals');

        expect(shared?.fields['variables']).toEqual([
            { name: 'region', value: 'eu', enabled: true, secret: false },
        ]);
        expect(read.resources.some((resource) => resource.place === 'workspace')).toBe(false);
    });
});
