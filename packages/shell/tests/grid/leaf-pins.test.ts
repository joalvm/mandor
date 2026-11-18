import type { GridLeaf, GridNode } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import {
    isPinnedTab,
    pinnedFirst,
    pinnedFirstGrid,
    withPinnedTab,
    withUnpinnedTab,
} from '../../src/grid/leaf-pins.js';
import type { Tab } from '../../src/tab/tab.js';

const RESOURCE = 'mandor://demo/payments/collection/a.yaml';

function tab(id: string, mark?: 'pinned' | 'preview'): Tab {
    const plain = { id, kind: 'item', resource: `${RESOURCE}#${id}` };

    if (mark === 'pinned') {
        return { ...plain, pinned: true };
    }

    return mark === 'preview' ? { ...plain, preview: true } : plain;
}

function leaf(...tabs: Tab[]): GridLeaf {
    return { activeTab: tabs[0]?.id ?? null, id: 'root', kind: 'leaf', tabs };
}

/** The strip as read: a pin before what is pinned, a star after what is only looked at. */
function strip(group: GridLeaf): string[] {
    return group.tabs.map((each) => {
        const name = each.pinned === true ? `^${each.id}` : each.id;

        return each.preview === true ? `${name}*` : name;
    });
}

describe('pinning a tab', () => {
    it('puts it after the pinned already there, and the rest keeps its order', () => {
        const pinned = withPinnedTab(leaf(tab('a', 'pinned'), tab('b'), tab('c')), 'c');

        expect(strip(pinned)).toEqual(['^a', '^c', 'b']);
    });

    /** Pinning is choosing: a tab open only to look at it is kept by it. */
    it('keeps a tab that was open only to look at it', () => {
        expect(strip(withPinnedTab(leaf(tab('a'), tab('b', 'preview')), 'b'))).toEqual(['^b', 'a']);
    });

    it('hands back the same group for a tab already pinned or not there', () => {
        const group = leaf(tab('a', 'pinned'), tab('b'));

        expect(withPinnedTab(group, 'a')).toBe(group);
        expect(withPinnedTab(group, 'gone')).toBe(group);
    });
});

describe('letting go of a pin', () => {
    it('makes the tab the first of the rest, next to where it stood', () => {
        const group = leaf(tab('a', 'pinned'), tab('b', 'pinned'), tab('c'));

        expect(strip(withUnpinnedTab(group, 'a'))).toEqual(['^b', 'a', 'c']);
    });

    it('hands back the same group for a tab that was not pinned', () => {
        const group = leaf(tab('a'));

        expect(withUnpinnedTab(group, 'a')).toBe(group);
    });
});

describe('the pinned standing first', () => {
    it('puts the pinned first, each side in the order it had', () => {
        const tabs = pinnedFirst([tab('a'), tab('b', 'pinned'), tab('c'), tab('d', 'pinned')]);

        expect(tabs.map((each) => each.id)).toEqual(['b', 'd', 'a', 'c']);
    });

    it('reorders every group of the tree and leaves the ones in order as they were', () => {
        const ordered = leaf(tab('a', 'pinned'), tab('b'));
        const astray: GridLeaf = { ...leaf(tab('c'), tab('d', 'pinned')), id: 'beside' };
        const grid: GridNode = {
            axis: 'row',
            children: [ordered, astray],
            kind: 'branch',
            sizes: [1, 1],
        };
        const fixed = pinnedFirstGrid(grid);
        const [first, second] = fixed.kind === 'branch' ? fixed.children : [];

        expect(first).toBe(ordered);
        expect(isPinnedTab(fixed, 'd')).toBe(true);
        expect(second?.kind === 'leaf' ? strip(second) : []).toEqual(['^d', 'c']);
        expect(pinnedFirstGrid(ordered)).toBe(ordered);
    });
});
