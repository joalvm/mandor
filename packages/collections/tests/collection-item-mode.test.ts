import type { CollectionNode } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { collectionItemMode } from '../src/lib/collection-item-mode.js';
import { nodeAt } from '../src/lib/node-at.js';

import { TWO_FOLDERS } from './support/two-folders.js';

/** One row of the tree, read as the hitbox reads it: what it holds and whether it is folded. */
function modeOf(path: string, folded = false, nodes: CollectionNode[] = TWO_FOLDERS) {
    const node = nodeAt(nodes, path);

    if (node === null) {
        throw new Error(`No node at ${path}`);
    }

    return collectionItemMode(nodes, node, folded);
}

describe('what a row is for the hitbox', () => {
    it('is expanded for an open folder with something in it, which has a first child under it', () => {
        expect(modeOf('pedidos')).toBe('expanded');
    });

    it('is a plain row for a folded folder that is not the last of its level', () => {
        expect(modeOf('pedidos', true)).toBe('standard');
    });

    it('is the last of its group for a folded folder that closes its level', () => {
        expect(modeOf('envios', true)).toBe('last-in-group');
    });

    it('is the last of its group for the item that ends a folder, where a drop can climb out', () => {
        expect(modeOf('pedidos/pedido-pagado')).toBe('last-in-group');
    });

    it('is a plain row for an item with a sibling after it', () => {
        expect(modeOf('pedidos/pedido-creado')).toBe('standard');
    });

    it('is not expanded for an open folder with nothing in it', () => {
        const nodes: CollectionNode[] = [
            { kind: 'collection', name: 'Vacia', path: 'vacia', children: [] },
            { kind: 'collection', name: 'Otra', path: 'otra', children: [] },
        ];

        expect(modeOf('vacia', false, nodes)).toBe('standard');
        expect(modeOf('otra', false, nodes)).toBe('last-in-group');
    });
});
