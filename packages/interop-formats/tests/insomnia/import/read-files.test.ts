import { degradation, importResourceSchema } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { resourceAt, resourcesOfFixture } from '../support/resources.js';

describe('readFiles: a collection of v4', () => {
    it('lists the workspace, its environments and the collection with what is in it', async () => {
        const resources = await resourcesOfFixture('collection-v4.json');

        expect(resources.map((each) => `${each.place}:${each.route}`)).toEqual([
            'environment:prod',
            'environment:staging',
            'connection:feed-en-vivo',
            'collection:tienda-de-mascotas',
            'item:tienda-de-mascotas/salud',
            'folder:tienda-de-mascotas/mascotas',
            'item:tienda-de-mascotas/mascotas/lista-de-mascotas',
            'item:tienda-de-mascotas/mascotas/alta-de-mascota',
        ]);
        expect(resources.every((each) => importResourceSchema.safeParse(each).success)).toBe(true);
        expect(new Set(resources.map((each) => each.origin.kind))).toEqual(new Set(['insomnia']));
    });

    it('turns the base environment into the variables of its collection', async () => {
        const collection = resourceAt(
            await resourcesOfFixture('collection-v4.json'),
            'collection',
            'tienda-de-mascotas',
        );

        expect(collection.name).toBe('Tienda de Mascotas');
        expect(collection.fields['variables']).toMatchObject([
            { name: 'base', value: 'https://api.test' },
            { name: 'retries', value: '3' },
            { name: 'verbose', value: 'true' },
            { name: 'owner', value: '{{base}}/owner' },
        ]);
    });

    it('reads a request with its path parameter, its rows and its references', async () => {
        const resources = await resourcesOfFixture('collection-v4.json');
        const item = resourceAt(resources, 'item', 'tienda-de-mascotas/mascotas/lista-de-mascotas');

        expect(item.fields).toMatchObject({
            method: 'GET',
            url: '{{base}}/pets/{species}',
            query: [
                { key: 'page', value: '1', enabled: true },
                { key: 'debug', value: '1', enabled: false },
            ],
            pathParams: [{ key: 'species', value: 'dog', enabled: true }],
            description: 'Devuelve la página pedida.',
        });
        expect(item.fields).not.toHaveProperty('auth');
    });

    it('keeps the auth of the folder, the request and the one that stops it', async () => {
        const resources = await resourcesOfFixture('collection-v4.json');

        expect(
            resourceAt(resources, 'folder', 'tienda-de-mascotas/mascotas').fields['auth'],
        ).toEqual({ type: 'bearer', token: '{{token}}' });
        expect(
            resourceAt(resources, 'item', 'tienda-de-mascotas/mascotas/alta-de-mascota').fields,
        ).toMatchObject({
            auth: { type: 'basic', username: 'ana', password: '{{password}}' },
            body: { type: 'json', content: '{"name":"{{petName}}"}' },
        });
        expect(resourceAt(resources, 'item', 'tienda-de-mascotas/salud').fields['auth']).toEqual({
            type: 'none',
        });
    });

    it('says on the collection that it left a gRPC request out', async () => {
        const collection = resourceAt(
            await resourcesOfFixture('collection-v4.json'),
            'collection',
            'tienda-de-mascotas',
        );

        expect(collection.degradations).toEqual([
            degradation('variableNameUnusable', { name: 'bad name' }),
            degradation('variableIsObject', { name: 'limits' }),
            degradation('kindLeftOut', { kind: 'grpc request', name: 'Catálogo' }),
        ]);
    });
});

describe('readFiles: a collection of v5', () => {
    it('lists the same things as the v4 one, in the order of its tree', async () => {
        const fromV4 = await resourcesOfFixture('collection-v4.json');
        const fromV5 = await resourcesOfFixture('collection-v5.yaml');
        const routes = (resources: typeof fromV4) =>
            resources.map((each) => `${each.place}:${each.route}`).sort();

        expect(routes(fromV5)).toEqual(routes(fromV4));
        expect(
            fromV5.map((each) => each.route).indexOf('tienda-de-mascotas/mascotas'),
        ).toBeLessThan(fromV5.map((each) => each.route).indexOf('tienda-de-mascotas/salud'));
    });

    it('identifies the collection by the id of its workspace, so a re-import is an update', async () => {
        const resources = await resourcesOfFixture('collection-v5.yaml');

        expect(new Set(resources.map((each) => each.origin.sourceId))).toEqual(
            new Set(['workspace:wrk_tienda']),
        );
    });
});
