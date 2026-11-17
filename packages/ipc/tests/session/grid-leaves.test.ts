import { describe, expect, it } from 'vitest';

import { leavesOf } from '../../src/session/grid-leaves.js';
import type { GridLeaf, GridNode } from '../../src/session/grid-node.js';

const TAB = { id: 'notes', kind: 'doc', resource: 'mandor://demo/payments/doc/notes.md' } as const;

function leaf(id: string, tabs: GridLeaf['tabs'] = []): GridLeaf {
    return { kind: 'leaf', id, tabs, activeTab: null };
}

describe('leavesOf', () => {
    it('answers a lone group with itself', () => {
        const alone = leaf('root', [TAB]);

        expect(leavesOf(alone)).toEqual([alone]);
    });

    it('answers the groups of a split from left to right', () => {
        const split: GridNode = {
            kind: 'branch',
            axis: 'row',
            sizes: [50, 50],
            children: [leaf('left'), leaf('right')],
        };

        expect(leavesOf(split).map((each) => each.id)).toEqual(['left', 'right']);
    });

    it('walks nested splits depth first, so the order is the one the tabs read in', () => {
        const nested: GridNode = {
            kind: 'branch',
            axis: 'row',
            sizes: [50, 50],
            children: [
                leaf('first'),
                {
                    kind: 'branch',
                    axis: 'column',
                    sizes: [30, 70],
                    children: [leaf('second'), leaf('third')],
                },
            ],
        };

        expect(leavesOf(nested).map((each) => each.id)).toEqual(['first', 'second', 'third']);
    });
});
