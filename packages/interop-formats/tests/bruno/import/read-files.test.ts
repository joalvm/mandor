import { degradation, importResourceSchema } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { resourceAt, resourcesOfFolder } from '../support/resources.js';

const LAYOUTS = ['oc', 'bru'] as const;
const STORE = 'tienda-de-mascotas';

describe.each(LAYOUTS)('readFiles: a collection in the layout "%s"', (layout) => {
    it('lists its environments and the collection with what is in it', async () => {
        const resources = await resourcesOfFolder(layout);

        expect(resources.map((each) => `${each.place}:${each.route}`)).toEqual([
            'environment:local',
            'environment:prod',
            'connection:pedidos-en-vivo',
            `collection:${STORE}`,
            `folder:${STORE}/mascotas`,
            `item:${STORE}/mascotas/lista-de-mascotas`,
            `item:${STORE}/mascotas/crear-mascota`,
            `item:${STORE}/mascotas/subir-foto`,
            `folder:${STORE}/admin`,
            `item:${STORE}/admin/borrar-mascota`,
            `item:${STORE}/consulta-de-pedidos`,
            `item:${STORE}/estado`,
            `item:${STORE}/pedidos-en-vivo-saludo`,
            `item:${STORE}/pedidos-en-vivo-ping`,
        ]);
        expect(resources.every((each) => importResourceSchema.safeParse(each).success)).toBe(true);
        expect(new Set(resources.map((each) => each.origin.kind))).toEqual(new Set(['bruno']));
    });

    it('keeps the auth and the variables on the collection and writes no workspace', async () => {
        const resources = await resourcesOfFolder(layout);
        const collection = resourceAt(resources, 'collection', STORE);

        expect(collection.fields).toMatchObject({ auth: { type: 'bearer', token: '{{token}}' } });
        expect(collection.fields).toHaveProperty('variables');
        expect(resources.some((each) => each.place === 'workspace')).toBe(false);
    });

    it('reads a request with its query, its rows and what it inherits', async () => {
        const resources = await resourcesOfFolder(layout);
        const item = resourceAt(resources, 'item', `${STORE}/mascotas/lista-de-mascotas`);

        expect(item.fields).toMatchObject({
            method: 'GET',
            url: '{{baseUrl}}/pets',
            query: [
                { key: 'limit', value: '10', enabled: true },
                { key: 'debug', value: '1', enabled: false },
                { key: 'page', value: '2', enabled: true },
            ],
            headers: [{ key: 'Accept-Language', value: 'es', enabled: true }],
        });
        expect(item.fields).not.toHaveProperty('auth');
    });

    it('reads a body, a form with a file and a GraphQL request', async () => {
        const resources = await resourcesOfFolder(layout);
        const created = resourceAt(resources, 'item', `${STORE}/mascotas/crear-mascota`);
        const photo = resourceAt(resources, 'item', `${STORE}/mascotas/subir-foto`);
        const orders = resourceAt(resources, 'item', `${STORE}/consulta-de-pedidos`);

        expect(created.fields).toMatchObject({ method: 'POST', body: { type: 'json' } });
        expect(JSON.stringify(created.fields['body'])).toContain('Rex');
        expect(photo.fields).toMatchObject({
            url: '{{baseUrl}}/pets/{id}/photo',
            pathParams: [{ key: 'id', value: '7', enabled: true }],
            body: {
                type: 'form',
                fields: [
                    { key: 'caption', value: 'Rex', kind: 'text' },
                    { key: 'photo', value: 'rex.png', kind: 'file' },
                ],
            },
        });
        expect(orders.fields).toMatchObject({
            method: 'POST',
            body: { type: 'graphql', query: '{ pedidos { id } }', variables: '{ "first": 1 }' },
            auth: { type: 'apikey', name: 'X-Key', value: '{{apiKey}}', in: 'header' },
        });
    });

    it('keeps the auth of the folders and of the requests as they came', async () => {
        const resources = await resourcesOfFolder(layout);
        const admin = resourceAt(resources, 'folder', `${STORE}/admin`);
        const status = resourceAt(resources, 'item', `${STORE}/estado`);

        expect(admin.fields['auth']).toMatchObject({ type: 'basic', username: 'admin' });
        expect(admin.fields['auth']).not.toMatchObject({ password: '' });
        expect(admin.degradations).toEqual([]);
        expect(status.fields['auth']).toEqual({
            type: 'oauth2-client-credentials',
            tokenUrl: '{{baseUrl}}/token',
            clientId: 'tienda',
            clientSecret: '{{clientSecret}}',
            clientAuth: 'body',
            scope: 'read',
        });
    });

    it('writes the environments, with the secret one empty', async () => {
        const prod = resourceAt(await resourcesOfFolder(layout), 'environment', 'prod');

        expect(prod.name).toBe('Prod');
        expect(prod.fields['variables']).toEqual(
            expect.arrayContaining([
                { name: 'baseUrl', value: 'https://api.tienda.test', enabled: true, secret: false },
                { name: 'token', value: '', enabled: true, secret: true },
                { name: 'debug', value: '1', enabled: false, secret: false },
            ]),
        );
        expect(prod.degradations).toEqual([]);
    });

    it('says on the collection what it left out', async () => {
        const collection = resourceAt(await resourcesOfFolder(layout), 'collection', STORE);

        expect(collection.degradations).toEqual([
            degradation('noPlaceCollection', { names: 'scripts' }),
        ]);
    });
});
