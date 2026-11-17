import { degradation, importResourceSchema } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { collectionResourcesOf } from '../../../src/insomnia/import/collection-resources.js';
import { documentNode, folderNode, requestNode } from '../support/trees.js';

describe('collectionResourcesOf', () => {
    it('starts with the collection, named and described as the document said', () => {
        const [collection] = collectionResourcesOf(
            documentNode({ name: 'Tienda de Mascotas', description: 'Notes' }),
        );

        expect(collection).toMatchObject({
            place: 'collection',
            route: 'tienda-de-mascotas',
            name: 'Tienda de Mascotas',
            fields: { name: 'Tienda de Mascotas', description: 'Notes' },
            origin: { kind: 'insomnia', sourceId: 'workspace:wrk_1' },
            degradations: [],
        });
    });

    it('leaves the description out when the document had none', () => {
        const [collection] = collectionResourcesOf(documentNode());

        expect(collection?.fields).not.toHaveProperty('description');
    });

    it('lists each folder before what is in it, every one under the route of its parent', () => {
        const resources = collectionResourcesOf(
            documentNode({
                children: [
                    folderNode({
                        name: 'Mascotas',
                        children: [
                            requestNode({ name: 'Lista' }),
                            folderNode({
                                name: 'Admin',
                                children: [requestNode({ name: 'Borra' })],
                            }),
                        ],
                    }),
                    requestNode({ name: 'Salud' }),
                ],
            }),
        );

        expect(resources.map((each) => `${each.place}:${each.route}`)).toEqual([
            'collection:tienda',
            'folder:tienda/mascotas',
            'item:tienda/mascotas/lista',
            'folder:tienda/mascotas/admin',
            'item:tienda/mascotas/admin/borra',
            'item:tienda/salud',
        ]);
        expect(resources.every((each) => importResourceSchema.safeParse(each).success)).toBe(true);
    });

    it('gives siblings of one name an id each, a folder and a request alike', () => {
        const resources = collectionResourcesOf(
            documentNode({
                children: [
                    requestNode({ name: 'Lista' }),
                    requestNode({ name: 'Lista' }),
                    folderNode({ name: 'Lista' }),
                ],
            }),
        );

        expect(resources.slice(1).map((each) => each.route)).toEqual([
            'tienda/lista',
            'tienda/lista-2',
            'tienda/lista-3',
        ]);
    });

    it('gives a folder and a request with no name the word of their kind', () => {
        const resources = collectionResourcesOf(
            documentNode({ children: [folderNode({ name: ' ' }), requestNode({ name: '' })] }),
        );

        expect(resources.slice(1).map((each) => [each.name, each.route])).toEqual([
            ['Folder', 'tienda/folder'],
            ['Request', 'tienda/request'],
        ]);
    });

    it('says on the collection what it left out, one line each', () => {
        const [collection] = collectionResourcesOf(
            documentNode({
                skipped: [
                    { kind: 'websocket_request', name: 'Feed' },
                    { kind: 'item', name: 'Other' },
                ],
            }),
        );

        expect(collection?.degradations).toEqual([
            degradation('kindLeftOut', { kind: 'websocket request', name: 'Feed' }),
            degradation('kindLeftOut', { kind: 'item', name: 'Other' }),
        ]);
    });
});
