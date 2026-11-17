import type { ImportResource, InteropFile } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { readFiles } from '../../../src/bruno/import/read-files.js';

function collectionFiles(dir: string, name: string, collectionBru: string): InteropFile[] {
    return [
        {
            path: `${dir}/bruno.json`,
            text: JSON.stringify({ version: '1', name, type: 'collection' }),
        },
        { path: `${dir}/collection.bru`, text: collectionBru },
    ];
}

function bearer(token: string): string {
    return `auth {\n  mode: bearer\n}\n\nauth:bearer {\n  token: ${token}\n}\n`;
}

const BASIC =
    'auth {\n  mode: basic\n}\n\nauth:basic {\n  username: ana\n  password: {{pass}}\n}\n';

function collectionsOf(resources: readonly ImportResource[]): ImportResource[] {
    return resources.filter((resource) => resource.place === 'collection');
}

describe('reading several Bruno collections that ask for an auth each', () => {
    it('gives every collection its own auth', async () => {
        const read = await readFiles([
            ...collectionFiles('pagos', 'Pagos', bearer('{{pagos}}')),
            ...collectionFiles('envios', 'Envios', BASIC),
        ]);
        const collections = collectionsOf(read.resources);
        const authOf = (name: string): unknown =>
            collections.find((collection) => collection.name === name)?.fields['auth'];

        expect(authOf('Pagos')).toEqual({ type: 'bearer', token: '{{pagos}}' });
        expect(authOf('Envios')).toMatchObject({ type: 'basic', username: 'ana' });
    });

    it('covers the auth in the fingerprint the collection is claimed with', async () => {
        const read = await readFiles([
            ...collectionFiles('pagos', 'Pagos', bearer('{{a}}')),
            ...collectionFiles('envios', 'Envios', bearer('{{b}}')),
        ]);
        const [first, second] = collectionsOf(read.resources);

        expect(first?.origin.fingerprint).not.toBe(second?.origin.fingerprint);
    });

    it('puts the auth of no collection on the workspace', async () => {
        const read = await readFiles([
            ...collectionFiles('pagos', 'Pagos', bearer('{{pagos}}')),
            ...collectionFiles('envios', 'Envios', BASIC),
        ]);

        expect(read.resources.filter((resource) => resource.place === 'workspace')).toEqual([]);
    });

    it('gives every collection its own auth and variables, with no line', async () => {
        const read = await readFiles([
            ...collectionFiles(
                'pagos',
                'Pagos',
                `${bearer('{{pagos}}')}\nvars:pre-request {\n  region: eu\n}\n`,
            ),
            ...collectionFiles(
                'envios',
                'Envios',
                `${BASIC}\nvars:pre-request {\n  zona: sur\n}\n`,
            ),
        ]);
        const collections = collectionsOf(read.resources);
        const pagos = collections.find((collection) => collection.name === 'Pagos');
        const envios = collections.find((collection) => collection.name === 'Envios');

        expect(pagos?.fields).toMatchObject({
            auth: { type: 'bearer', token: '{{pagos}}' },
            variables: [{ name: 'region', value: 'eu', enabled: true, secret: false }],
        });
        expect(envios?.fields).toMatchObject({
            auth: { type: 'basic', username: 'ana' },
            variables: [{ name: 'zona', value: 'sur', enabled: true, secret: false }],
        });
        expect(pagos?.degradations).toEqual([]);
        expect(envios?.degradations).toEqual([]);
    });

    it('says nothing of the auth, which the collection keeps', async () => {
        const read = await readFiles([
            ...collectionFiles('pagos', 'Pagos', bearer('{{pagos}}')),
            ...collectionFiles('envios', 'Envios', bearer('{{envios}}')),
        ]);

        expect(collectionsOf(read.resources).flatMap((each) => each.degradations)).toEqual([]);
    });
});
