import { describe, expect, it } from 'vitest';

import { authChainOf } from '../../src/auth/auth-chain-of.js';

describe('authChainOf', () => {
    it('keeps each level with its name and the auth it declares, in order', () => {
        expect(
            authChainOf([
                {
                    level: 'collection',
                    place: { kind: 'folder', path: 'pagos' },
                    name: 'Pagos',
                    settings: { auth: { type: 'none' }, description: 'x' },
                },
                { level: 'workspace', place: { kind: 'workspace' }, name: 'API', settings: {} },
            ]),
        ).toEqual([
            { place: { kind: 'folder', path: 'pagos' }, name: 'Pagos', auth: { type: 'none' } },
            { place: { kind: 'workspace' }, name: 'API', auth: undefined },
        ]);
    });
});
