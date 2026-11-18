import { degradation, fingerprintOf } from '@mandor/interop-core';
import { workspaceBundleSchema } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { globalsResourceOf } from '../../../src/mandor/import/globals-resource.js';

function bundleWith(globals: unknown[]) {
    return workspaceBundleSchema.parse({
        mandor: 'workspace',
        formatVersion: 2,
        app: 'sync',
        workspace: { name: 'Tienda' },
        globals,
    });
}

const ZONA = { name: 'zona', value: 'eu', enabled: true, secret: false };

describe('globalsResourceOf', () => {
    it('writes nothing for a bundle without globals', () => {
        expect(globalsResourceOf(bundleWith([]), 'Tienda')).toBeUndefined();
    });

    it('brings the globals to the one place the origin keeps them', () => {
        expect(globalsResourceOf(bundleWith([ZONA]), 'Tienda')).toEqual({
            place: 'globals',
            itemKind: null,
            route: '.',
            name: 'Tienda',
            fields: { variables: [ZONA] },
            origin: {
                kind: 'mandor',
                sourceId: 'Tienda',
                fingerprint: fingerprintOf({ variables: [ZONA] }),
            },
            degradations: [],
        });
    });

    it('lets a secret in with its name and its mark, whatever a hand-edited file put in it', () => {
        const resource = globalsResourceOf(
            bundleWith([{ name: 'clave', value: 'filtrada', enabled: true, secret: true }]),
            'Tienda',
        );

        expect(resource?.fields).toEqual({
            variables: [{ name: 'clave', value: '', enabled: true, secret: true }],
        });
        expect(resource?.degradations).toEqual([
            degradation('secretEntersEmptyGlobals', { name: 'clave' }),
        ]);
    });
});
