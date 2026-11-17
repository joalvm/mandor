import type { GridNode } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { dockviewLayoutOf } from '../../src/grid/dockview-layout.js';
import type { Tab } from '../../src/tab/tab.js';

const ONE = 'mandor://demo/payments/doc/one.md';
const TWO = 'mandor://demo/payments/doc/two.md';

function tab(id: string, resource: string): Tab {
    return { id, kind: 'doc', resource };
}

function leaf(id: string, tabs: Tab[], activeTab: string | null): GridNode {
    return { kind: 'leaf', id, tabs, activeTab };
}

function titleOf(each: Tab): string {
    return `title of ${each.id}`;
}

describe('projecting the grid of the session onto the layout of the view', () => {
    /** The view refuses a layout whose root is a group, so a lone group travels inside a split. */
    it('wraps a single group in the root the view demands', () => {
        const layout = dockviewLayoutOf(leaf('root', [tab('one', ONE)], 'one'), 'root', titleOf);

        expect(layout.grid.root).toEqual({
            type: 'branch',
            size: 100,
            data: [
                {
                    type: 'leaf',
                    size: 100,
                    data: { views: ['one'], activeView: 'one', id: 'root' },
                },
            ],
        });
        expect(layout.activeGroup).toBe('root');
    });

    it('names every tab as a panel that carries its kind and its resource', () => {
        const layout = dockviewLayoutOf(leaf('root', [tab('one', ONE)], 'one'), 'root', titleOf);

        expect(layout.panels).toEqual({
            one: {
                id: 'one',
                contentComponent: 'tab',
                title: 'title of one',
                params: { kind: 'doc', resource: ONE },
            },
        });
    });

    it('reads the orientation of the root off the axis of the split', () => {
        const grid: GridNode = {
            kind: 'branch',
            axis: 'column',
            sizes: [60, 40],
            children: [leaf('root', [], null), leaf('group-2', [], null)],
        };

        expect(dockviewLayoutOf(grid, 'root', titleOf).grid.orientation).toBe('VERTICAL');
    });

    it('gives a group with no active tab a group with no active view', () => {
        const layout = dockviewLayoutOf(leaf('root', [], null), 'root', titleOf);
        const [group] = layout.grid.root.data as { data: object }[];

        expect(group?.data).toEqual({ views: [], id: 'root' });
    });

    it('carries the shares of a split into the sizes of the view', () => {
        const grid: GridNode = {
            kind: 'branch',
            axis: 'row',
            sizes: [60, 40],
            children: [
                leaf('root', [tab('one', ONE)], 'one'),
                leaf('group-2', [tab('two', TWO)], 'two'),
            ],
        };
        const layout = dockviewLayoutOf(grid, 'group-2', titleOf);

        expect(layout.grid.orientation).toBe('HORIZONTAL');
        expect(layout.grid.root.type).toBe('branch');
        expect((layout.grid.root.data as { size: number }[]).map((child) => child.size)).toEqual([
            60, 40,
        ]);
        expect(layout.activeGroup).toBe('group-2');
    });

    it('flattens a repeated axis so the view does not draw it sideways', () => {
        const grid: GridNode = {
            kind: 'branch',
            axis: 'row',
            sizes: [50, 50],
            children: [
                leaf('root', [], null),
                {
                    kind: 'branch',
                    axis: 'row',
                    sizes: [50, 50],
                    children: [leaf('group-2', [], null), leaf('group-3', [], null)],
                },
            ],
        };
        const children = dockviewLayoutOf(grid, 'root', titleOf).grid.root.data as {
            size: number;
            data: { id: string };
        }[];

        expect(children.map((child) => child.data.id)).toEqual(['root', 'group-2', 'group-3']);
        expect(children.map((child) => child.size)).toEqual([50, 25, 25]);
    });
});
