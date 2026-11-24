import { degradation, type ImportResource, importResourceSchema } from '@mandor/interop-core';
import { folderSettingsSchema, requestItemSchema } from '@mandor/schema';
import { beforeAll, describe, expect, it } from 'vitest';

import { resourceAt, resourcesOfFixture } from '../support/resources.js';

describe('importResourcesOf: the collection as the resources of a workspace', () => {
    let resources: ImportResource[] = [];

    beforeAll(async () => {
        resources = await resourcesOfFixture('collection-v2.1.json');
    });

    it('lists the collection first, and each thing after what it hangs from', () => {
        const places = resources.map((each) => each.place);

        expect(places[0]).toBe('collection');
        expect(places).not.toContain('workspace');
        expect(places.indexOf('folder')).toBeGreaterThan(0);
        resources.forEach(({ place, route }, at) => {
            const parent = route.split('/').slice(0, -1).join('/');

            expect(
                place === 'collection' || resources.slice(0, at).some((r) => r.route === parent),
            ).toBe(true);
        });
        expect(places).not.toContain('environment');
    });

    it('gives every resource a shape the pipeline accepts and one origin', () => {
        for (const resource of resources) {
            expect(importResourceSchema.safeParse(resource).success).toBe(true);
            expect(resource.origin.kind).toBe('postman');
        }

        expect(new Set(resources.map((each) => each.origin.sourceId)).size).toBe(1);
    });

    it('sits a folder in the directory of its parent and a request in that of its folder', () => {
        const folders = resources
            .filter((each) => each.place === 'folder')
            .map((each) => each.route);
        const items = resources.filter((each) => each.place === 'item').map((each) => each.route);

        expect(folders).toEqual(['demo-api/users', 'demo-api/users/admin']);
        expect(items).toContain('demo-api/users/get-user');
        expect(items).toContain('demo-api/users/get-user-2');
        expect(items).toContain('demo-api/users/admin/list-admins');
    });

    it('writes a folder the schema of Mandor reads', () => {
        const folder = resourceAt(resources, 'folder', 'demo-api/users/admin');

        expect(
            folderSettingsSchema.safeParse({ ...folder.fields, name: folder.name }).success,
        ).toBe(true);
        expect(folder.fields['auth']).toMatchObject({ type: 'apikey', name: 'X-Admin' });
        expect(Object.keys(folder.fields['scripts'] as object)).toHaveLength(1);
        expect(folder.fields['description']).toBe('The people in charge.');
    });

    it('writes a request the schema of Mandor reads, with the path param and the switch of a header', () => {
        const item = resourceAt(resources, 'item', 'demo-api/users/get-user');
        const parsed = requestItemSchema.safeParse({ ...item.fields, name: item.name });

        expect(parsed.success).toBe(true);
        expect(item.fields['url']).toBe('{{base}}/users/{id}');
        expect(item.fields['pathParams']).toEqual([{ key: 'id', value: '7', enabled: true }]);
        expect(item.fields['headers']).toEqual([
            { key: 'X-Trace', value: '1', enabled: false },
            { key: 'Accept', value: 'application/json', enabled: true },
        ]);
        expect(item.fields['auth']).toEqual({ type: 'bearer', token: '{{token}}' });
    });

    it('puts the scripts of the three levels in their moments, untouched and not approved', () => {
        const collection = resourceAt(resources, 'collection', 'demo-api');
        const item = resourceAt(resources, 'item', 'demo-api/users/get-user');

        expect(Object.keys(collection.fields['scripts'] as object)).toHaveLength(1);
        expect(item.fields['scripts']).toEqual({
            onBeforeRequest: { source: "pm.variables.set('x', 1);" },
            onResponse: { source: expect.stringContaining('pm.') as unknown },
        });
    });

    it('holds the auth in the collection as it came', () => {
        const collection = resourceAt(resources, 'collection', 'demo-api');

        expect(collection.fields['auth']).toMatchObject({ type: 'basic', username: 'ana' });
        expect(collection.fields['auth']).not.toMatchObject({ password: '' });
    });

    it('holds the description and the variables in the collection, each secret blank', () => {
        const collection = resourceAt(resources, 'collection', 'demo-api');

        expect(collection.fields['description']).toBe('The collection the tests read.');
        expect(collection.fields['variables']).toEqual([
            { name: 'base', value: 'http://127.0.0.1:1', enabled: true, secret: false },
            { name: 'apiSecret', value: '', enabled: true, secret: false },
        ]);
        expect(collection.degradations).toEqual(
            expect.arrayContaining([
                degradation('secretCollectionVariableNotImported', { name: 'apiSecret' }),
                degradation('variableNameUnusable', { name: 'bad name' }),
            ]),
        );
    });

    it('holds the description of a folder in the folder, with no row', () => {
        const folder = resourceAt(resources, 'folder', 'demo-api/users');

        expect(folder.fields['description']).toBe('Everything about users.');
        expect(folder.degradations).toEqual([]);
    });
});
