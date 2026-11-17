import { describe, expect, it } from 'vitest';

import {
    collectionChainRequestSchema,
    collectionChainResultSchema,
} from '../../src/collection/collection-chain.js';

describe('collectionChainRequestSchema', () => {
    it('accepts the folder the item hangs from', () => {
        const request = { workspaceId: 'api-pagos', parentPath: 'pedidos/abril' };

        expect(collectionChainRequestSchema.parse(request)).toEqual(request);
    });

    it('accepts null as the top level, where the workspace is the only level above', () => {
        expect(
            collectionChainRequestSchema.parse({ workspaceId: 'api-pagos', parentPath: null }),
        ).toEqual({ workspaceId: 'api-pagos', parentPath: null });
    });

    it('refuses a path made of anything but id segments', () => {
        expect(() =>
            collectionChainRequestSchema.parse({ workspaceId: 'api-pagos', parentPath: 'a//b' }),
        ).toThrow();
    });

    it('answers each level with its settings, the workspace last', () => {
        const levels = [
            {
                level: 'collection',
                place: { kind: 'folder', path: 'pedidos' },
                name: 'Pedidos',
                settings: { variables: [{ name: 'a', value: '1', enabled: true, secret: false }] },
            },
            { level: 'workspace', place: { kind: 'workspace' }, name: 'API', settings: {} },
        ];

        expect(collectionChainResultSchema.parse({ ok: true, value: levels })).toEqual({
            ok: true,
            value: levels,
        });
    });
});
