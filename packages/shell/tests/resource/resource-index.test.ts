import type { GridNode } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { resourceIndexOf } from '../../src/resource/resource-index.js';

function leaf(id: string, ...tabs: [tab: string, resource: string][]): GridNode {
    return {
        activeTab: tabs[0]?.[0] ?? null,
        id,
        kind: 'leaf',
        tabs: tabs.map(([tab, resource]) => ({ id: tab, kind: 'doc', resource })),
    };
}

const GRID: GridNode = {
    axis: 'row',
    children: [
        leaf('root', ['a', 'mandor://one'], ['b', 'mandor://two']),
        leaf('group-2', ['a#2', 'mandor://one']),
    ],
    kind: 'branch',
    sizes: [50, 50],
};

describe('the index of the resources the window has open', () => {
    it('is empty for a window with no tab', () => {
        expect(resourceIndexOf(leaf('root'))).toEqual({});
    });

    it('lists the tabs looking at each resource in the order the grid reads', () => {
        expect(resourceIndexOf(GRID)).toEqual({
            'mandor://one': { missing: false, tabs: ['a', 'a#2'] },
            'mandor://two': { missing: false, tabs: ['b'] },
        });
    });

    it('carries over that a resource is gone from disk while a tab still looks at it', () => {
        const before = { 'mandor://one': { missing: true, tabs: ['a'] } };

        expect(resourceIndexOf(GRID, before)['mandor://one']?.missing).toBe(true);
        expect(resourceIndexOf(GRID, before)['mandor://two']?.missing).toBe(false);
    });

    it('drops a resource with the last tab that was looking at it', () => {
        const before = { 'mandor://gone': { missing: true, tabs: ['z'] } };

        expect(Object.keys(resourceIndexOf(GRID, before))).toEqual([
            'mandor://one',
            'mandor://two',
        ]);
    });
});
