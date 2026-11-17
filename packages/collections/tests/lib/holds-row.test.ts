import type { CollectionNode } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { holdsRow } from '../../src/lib/holds-row.js';

const NODES: CollectionNode[] = [
    {
        kind: 'collection',
        name: 'Acceso',
        path: 'acceso',
        children: [
            {
                kind: 'item',
                itemKind: 'request',
                name: 'Login',
                path: 'acceso/login',
                examples: [{ key: 'Creado', name: 'Creado', mark: '201' }],
                tags: [],
            },
        ],
    },
];

describe('whether the tree still holds a row', () => {
    it('holds the node a path names', () => {
        expect(holdsRow(NODES, 'acceso/login')).toBe(true);
        expect(holdsRow(NODES, 'acceso/gone')).toBe(false);
    });

    it('holds the example an id names while its item still lists the key', () => {
        expect(holdsRow(NODES, 'acceso/login:Creado')).toBe(true);
        expect(holdsRow(NODES, 'acceso/login:Roto')).toBe(false);
    });

    it('does not hold an example of something that is not an item, or of nothing', () => {
        expect(holdsRow(NODES, 'acceso:Creado')).toBe(false);
        expect(holdsRow(NODES, 'gone:Creado')).toBe(false);
    });
});
