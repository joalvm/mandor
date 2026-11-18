import type { GridNode } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { groupOfTab, leafOf, mapLeaf, stillOpen } from '../../src/grid/grid-leaf.js';

function leaf(id: string, ...tabs: string[]): GridNode {
    return {
        activeTab: tabs[0] ?? null,
        id,
        kind: 'leaf',
        tabs: tabs.map((tab) => ({ id: tab, kind: 'doc', resource: `mandor://demo/${tab}` })),
    };
}

const GRID: GridNode = {
    axis: 'row',
    children: [leaf('root', 'a'), leaf('group-2', 'b')],
    kind: 'branch',
    sizes: [50, 50],
};

describe('finding groups of the grid', () => {
    it('finds a group by its id, and nothing for one that is not there', () => {
        expect(leafOf(GRID, 'group-2')?.id).toBe('group-2');
        expect(leafOf(GRID, 'group-9')).toBeUndefined();
    });

    it('finds the group that holds a tab', () => {
        expect(groupOfTab(GRID, 'b')?.id).toBe('group-2');
        expect(groupOfTab(GRID, 'z')).toBeUndefined();
    });

    it('keeps a group that is still in the window and forgets one that left', () => {
        expect(stillOpen(GRID, 'root')).toBe('root');
        expect(stillOpen(GRID, 'group-9')).toBeNull();
        expect(stillOpen(GRID, null)).toBeNull();
    });
});

describe('rewriting one group', () => {
    it('changes the group asked for and hands back the others by reference', () => {
        const next = mapLeaf(GRID, 'root', (each) => ({ ...each, activeTab: null }));

        if (next.kind !== 'branch') {
            throw new Error('the grid is a branch');
        }

        expect(leafOf(next, 'root')?.activeTab).toBeNull();
        expect(next.children[1]).toBe(GRID.children[1]);
    });

    it('rewrites a lone group when it is the one asked for', () => {
        const single = leaf('root', 'a');

        expect(mapLeaf(single, 'root', (each) => ({ ...each, tabs: [] }))).toMatchObject({
            tabs: [],
        });
        expect(mapLeaf(single, 'other', (each) => ({ ...each, tabs: [] }))).toBe(single);
    });
});
