import type { GridNode } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { mapTabs, tabsByName } from '../../src/grid/grid-tabs.js';
import type { Tab } from '../../src/tab/tab.js';

function tab(id: string): Tab {
    return { id, kind: 'doc', resource: `mandor://demo/${id}` };
}

function leaf(id: string, ...tabs: Tab[]): GridNode {
    return { activeTab: tabs[0]?.id ?? null, id, kind: 'leaf', tabs };
}

const GRID: GridNode = {
    axis: 'row',
    children: [leaf('root', tab('a'), tab('b')), leaf('group-2', tab('c'))],
    kind: 'branch',
    sizes: [50, 50],
};

describe('the tabs of the whole window', () => {
    it('names every tab of every group', () => {
        expect([...tabsByName(GRID).keys()]).toEqual(['a', 'b', 'c']);
        expect(tabsByName(GRID).get('c')).toEqual(tab('c'));
    });

    it('gives back the tree itself when the change touched no tab', () => {
        expect(mapTabs(GRID, (each) => each)).toBe(GRID);
    });

    it('rewrites a tab and keeps by reference every group it did not touch', () => {
        const next = mapTabs(GRID, (each) => (each.id === 'c' ? { ...each, pinned: true } : each));

        if (next.kind !== 'branch') {
            throw new Error('the grid is a branch');
        }

        expect(next.children[0]).toBe(GRID.children[0]);
        expect(next.children[1]).toMatchObject({ tabs: [{ id: 'c', pinned: true }] });
    });
});
