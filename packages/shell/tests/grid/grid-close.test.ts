import type { GridNode } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { withoutLeaf } from '../../src/grid/grid-close.js';

function leaf(id: string, tabs: string[] = []): GridNode {
    return {
        activeTab: tabs[0] ?? null,
        id,
        kind: 'leaf',
        tabs: tabs.map((tab) => ({ id: tab, kind: 'doc', resource: `mandor://demo/${tab}` })),
    };
}

function branch(axis: 'column' | 'row', sizes: number[], children: GridNode[]): GridNode {
    return { axis, children, kind: 'branch', sizes };
}

describe('taking a group out of the grid', () => {
    it('empties the root instead of removing it, because a window with no group shows nothing', () => {
        expect(withoutLeaf(leaf('root', ['a']), 'root')).toEqual(leaf('root'));
    });

    it('leaves the sibling alone in the place of the split that held both', () => {
        const sibling = leaf('root', ['a']);

        expect(withoutLeaf(branch('row', [50, 50], [sibling, leaf('group-2')]), 'group-2')).toBe(
            sibling,
        );
    });

    it('keeps the split and the shares of what stays when more than one child is left', () => {
        const grid = branch('row', [20, 30, 50], [leaf('root'), leaf('group-2'), leaf('group-3')]);

        expect(withoutLeaf(grid, 'group-2')).toEqual(
            branch('row', [20, 50], [leaf('root'), leaf('group-3')]),
        );
    });

    it('reaches a group nested under other splits', () => {
        const grid = branch(
            'row',
            [50, 50],
            [leaf('root'), branch('column', [50, 50], [leaf('group-2'), leaf('group-3')])],
        );

        expect(withoutLeaf(grid, 'group-2')).toEqual(
            branch('row', [50, 50], [leaf('root'), leaf('group-3')]),
        );
    });

    it('changes nothing for a group the grid does not hold', () => {
        const grid = branch('row', [50, 50], [leaf('root'), leaf('group-2')]);

        expect(withoutLeaf(grid, 'nowhere')).toEqual(grid);
    });
});
