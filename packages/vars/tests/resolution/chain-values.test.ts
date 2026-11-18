import { describe, expect, it } from 'vitest';

import { chainValues } from '../../src/index.js';

function variable(name: string, value: string, enabled = true): object {
    return { name, value, enabled, secret: false };
}

describe('chainValues', () => {
    it('keeps the order of the chain and the active variables of each group', () => {
        expect(
            chainValues([
                {
                    level: 'folder',
                    place: { kind: 'folder', path: 'pagos/altas' },
                    name: 'Altas',
                    settings: { variables: [variable('a', '1'), variable('b', '2', false)] },
                },
                {
                    level: 'collection',
                    place: { kind: 'folder', path: 'pagos' },
                    name: 'Pagos',
                    settings: {},
                },
                {
                    level: 'workspace',
                    place: { kind: 'workspace' },
                    name: 'API',
                    settings: { auth: { type: 'none' } },
                },
            ] as never),
        ).toEqual([
            { level: 'folder', name: 'Altas', values: { a: '1' } },
            { level: 'collection', name: 'Pagos', values: {} },
        ]);
    });
});
