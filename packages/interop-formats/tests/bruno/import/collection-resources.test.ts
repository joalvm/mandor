import { degradation, importResourceSchema } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { collectionResourcesOf } from '../../../src/bruno/import/collection-resources.js';
import { documentNode, folderNode, requestNode, rowOf } from '../support/trees.js';

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
            origin: { kind: 'bruno', sourceId: 'collection:abc' },
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
});

describe('collectionResourcesOf: what the collection left out', () => {
    it('says on the collection what it left out, one line each', () => {
        const [collection] = collectionResourcesOf(
            documentNode({
                skipped: [
                    { kind: 'ws', name: 'Feed' },
                    { kind: 'grpc', name: 'Other' },
                ],
                headers: [rowOf('Accept', 'application/json')],
                leftOut: ['scripts'],
            }),
        );

        expect(collection?.degradations).toEqual([
            degradation('kindLeftOut', { kind: 'ws', name: 'Feed' }),
            degradation('kindLeftOut', { kind: 'grpc', name: 'Other' }),
            degradation('noPlaceCollection', { names: 'scripts' }),
        ]);
    });

    it('keeps the auth on the collection and says nothing of it', () => {
        const [collection] = collectionResourcesOf(
            documentNode({ auth: { type: 'bearer', token: '{{t}}' } }),
        );

        expect(collection?.fields).toMatchObject({ auth: { type: 'bearer', token: '{{t}}' } });
        expect(collection?.degradations).toEqual([]);
    });

    it('leaves the auth out of the fields of a collection that asks for none', () => {
        const [inherits] = collectionResourcesOf(documentNode());
        const [explicit] = collectionResourcesOf(documentNode({ auth: { type: 'inherit' } }));

        expect(inherits?.fields).not.toHaveProperty('auth');
        expect(explicit?.fields).not.toHaveProperty('auth');
    });

    it('stops the auth of the workspace on a collection that says `none`', () => {
        const [collection] = collectionResourcesOf(documentNode({ auth: { type: 'none' } }));

        expect(collection?.fields).toMatchObject({ auth: { type: 'none' } });
    });

    it('keeps the token it was given, as it came', () => {
        const [collection] = collectionResourcesOf(
            documentNode({ auth: { type: 'bearer', token: 'abc' } }),
        );

        expect(collection?.fields).toMatchObject({ auth: { type: 'bearer', token: 'abc' } });
        expect(collection?.degradations).toEqual([]);
    });

    it('enters with no auth a collection whose scheme Mandor has no word for, and says so', () => {
        const [collection] = collectionResourcesOf(documentNode({ auth: { type: 'digest' } }));

        expect(collection?.fields).toMatchObject({ auth: { type: 'none' } });
        expect(collection?.degradations).toEqual([
            degradation('authNoEquivalentCollection', { type: 'digest' }),
        ]);
    });

    it('holds the variables and the headers of the collection, with no line', () => {
        const [collection] = collectionResourcesOf(
            documentNode({
                variables: [{ name: 'a', value: '1', disabled: false, secret: false }],
                headers: [rowOf('Accept', 'application/json')],
            }),
        );

        expect(collection?.fields).toMatchObject({
            variables: [{ name: 'a', value: '1', enabled: true, secret: false }],
            headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
        });
        expect(collection?.degradations).toEqual([]);
    });

    it('says nothing of the variables of a collection that has none', () => {
        const [collection] = collectionResourcesOf(documentNode());

        expect(collection?.fields).not.toHaveProperty('variables');
        expect(collection?.degradations).toEqual([]);
    });
});
