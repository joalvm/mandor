import { degradation, importResourceSchema } from '@mandor/interop-core';
import { folderSettingsSchema } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { folderResourceOf } from '../../../src/bruno/import/folder-resource.js';
import { folderNode, rowOf } from '../support/trees.js';

describe('folderResourceOf', () => {
    it('is a folder of the workspace under its route, with the origin of the document', () => {
        const resource = folderResourceOf(folderNode(), 'collection:c', 'tienda/mascotas');

        expect(resource).toMatchObject({
            place: 'folder',
            itemKind: null,
            route: 'tienda/mascotas',
            name: 'Mascotas',
            fields: {},
            origin: { kind: 'bruno', sourceId: 'collection:c' },
            degradations: [],
        });
        expect(importResourceSchema.safeParse(resource).success).toBe(true);
    });

    it('holds the auth its requests inherit', () => {
        const resource = folderResourceOf(
            folderNode({ auth: { type: 'bearer', token: '{{token}}' } }),
            'collection:c',
            'tienda/mascotas',
        );

        expect(resource.fields).toEqual({ auth: { type: 'bearer', token: '{{token}}' } });
        expect(
            folderSettingsSchema.safeParse({ ...resource.fields, name: resource.name }).success,
        ).toBe(true);
    });

    it('holds what the folder says of itself, and says only what it cannot hold', () => {
        const resource = folderResourceOf(
            folderNode({
                description: 'Notes',
                headers: [rowOf('X-A', '1')],
                auth: { type: 'digest' },
                leftOut: ['scripts'],
            }),
            'collection:c',
            'tienda/mascotas',
        );

        expect(resource.degradations).toEqual([
            degradation('authNoEquivalentFolder', { type: 'digest' }),
            degradation('noPlaceFolder', { names: 'scripts' }),
        ]);
        expect(resource.fields).toEqual({
            description: 'Notes',
            headers: [{ key: 'X-A', value: '1', enabled: true }],
            auth: { type: 'none' },
        });
    });

    it('has another fingerprint when its auth changes', () => {
        const plain = folderResourceOf(folderNode(), 'collection:c', 'a').origin.fingerprint;
        const withAuth = folderResourceOf(
            folderNode({ auth: { type: 'none' } }),
            'collection:c',
            'a',
        ).origin.fingerprint;

        expect(withAuth).not.toBe(plain);
    });
});
