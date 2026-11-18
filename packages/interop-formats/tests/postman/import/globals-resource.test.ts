import type { InteropDocument } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { globalsResourceOf } from '../../../src/postman/import/globals-resource.js';

function globalsDocument(
    variables: { name: string; value: string; secret?: boolean }[],
): InteropDocument {
    return {
        name: 'Globals',
        sourceId: 'globals:1',
        environments: [
            {
                name: 'Globals',
                variables: variables.map((variable) => ({
                    name: variable.name,
                    value: variable.value,
                    enabled: true,
                    secret: variable.secret ?? false,
                })),
            },
        ],
    } as InteropDocument;
}

describe('globalsResourceOf', () => {
    it('makes the globals of the origin, a secret with its mark and without its value', () => {
        const resource = globalsResourceOf([
            globalsDocument([
                { name: 'region', value: 'eu' },
                { name: 'token', value: 'tok', secret: true },
            ]),
        ]);

        expect(resource).toMatchObject({
            place: 'globals',
            route: '.',
            fields: {
                variables: [
                    { name: 'region', value: 'eu', enabled: true, secret: false },
                    { name: 'token', value: 'tok', enabled: true, secret: true },
                ],
            },
        });
        expect(resource?.degradations).toEqual([]);
    });

    it('is nothing without a globals file, or with one that declares nothing', () => {
        expect(globalsResourceOf([])).toBeUndefined();
        expect(globalsResourceOf([globalsDocument([])])).toBeUndefined();
    });
});
