import type { GridLeaf, GridNode } from '@mandor/ipc';
import { afterEach, describe, expect, it } from 'vitest';

import {
    closedAfter,
    closedMoved,
    closedWithout,
    type ClosedTab,
} from '../../src/tab/closed-tabs.js';
import { declareTabKind } from '../../src/tab/tab-kind-registry.js';
import { tabPreferences } from '../../src/tab/tab-preferences.js';
import type { Tab } from '../../src/tab/tab.js';

const DOCS = 'mandor://demo/payments/doc';

function tab(id: string, preview?: true): Tab {
    const plain = { id, kind: 'doc', resource: `${DOCS}/${id}.md` };

    return preview === undefined ? plain : { ...plain, preview };
}

function leaf(id: string, ...tabs: Tab[]): GridLeaf {
    return { activeTab: tabs[0]?.id ?? null, id, kind: 'leaf', tabs };
}

function names(closed: readonly ClosedTab[]): string[] {
    return closed.map((each) => `${each.groupId}:${String(each.index)}:${each.tab.id}`);
}

/** Closes one tab after another, `count` of them, and hands back what the window remembers. */
function closeMany(count: number): readonly ClosedTab[] {
    let closed: readonly ClosedTab[] = [];

    for (let round = 0; round < count; round += 1) {
        closed = closedAfter(closed, leaf('root', tab(`t${String(round)}`)), {}, leaf('root'));
    }

    return closed;
}

afterEach(() => {
    tabPreferences.setState(tabPreferences.getInitialState());
});

describe('what the window remembers of the tabs that left it', () => {
    it('remembers each tab gone, with its group and its place, the latest on top', () => {
        const before = leaf('root', tab('a'), tab('b'), tab('c'));
        const closed = closedAfter([], before, {}, leaf('root', tab('a')));

        expect(names(closed)).toEqual(['root:2:c', 'root:1:b']);
    });

    /** A tab that moved to another group keeps its name: it did not leave. */
    it('does not count a tab that only moved', () => {
        const before: GridNode = leaf('root', tab('a'), tab('b'));
        const after: GridNode = {
            axis: 'row',
            children: [leaf('root', tab('a')), leaf('beside', tab('b'))],
            kind: 'branch',
            sizes: [1, 1],
        };
        const nothing: readonly ClosedTab[] = [];

        expect(closedAfter(nothing, before, {}, after)).toBe(nothing);
    });

    it('forgets a tab whose resource is gone from disk', () => {
        const resources = { [`${DOCS}/a.md`]: { missing: true, tabs: ['a'] } };
        const closed = closedAfter([], leaf('root', tab('a')), resources, leaf('root'));

        expect(closed).toEqual([]);
    });

    it('forgets a tab of a kind that lets go of its thing as it closes', () => {
        const undeclare = declareTabKind({
            closable: true,
            icon: 'send',
            id: 'doc',
            reopenable: false,
            title: (resource) => resource,
        });
        const closed = closedAfter([], leaf('root', tab('a')), {}, leaf('root'));

        undeclare();

        expect(closed).toEqual([]);
    });

    /** Reopening is choosing: a look that was replaced comes back kept. */
    it('remembers a look that was replaced, kept', () => {
        const closed = closedAfter([], leaf('root', tab('a', true)), {}, leaf('root', tab('b')));

        expect(closed[0]?.tab).toEqual(tab('a'));
    });

    it('keeps one entry per tab and only the latest twenty, unless told otherwise', () => {
        let closed = closeMany(25);

        closed = closedAfter(closed, leaf('root', tab('t30')), {}, leaf('root'));

        expect(closed).toHaveLength(20);
        expect(names(closed).slice(0, 2)).toEqual(['root:0:t30', 'root:0:t24']);
    });

    it('reaches only as far back as the person set', () => {
        tabPreferences.setState({ closedKept: 10 });

        const closed = closeMany(15);

        expect(closed).toHaveLength(10);
        expect(names(closed)[0]).toBe('root:0:t14');
        expect(names(closed).at(-1)).toBe('root:0:t5');
    });
});

describe('what happens on disk to a tab that was closed', () => {
    const closed: ClosedTab[] = [
        { groupId: 'root', index: 0, tab: { ...tab('a'), resource: `${DOCS}/guides/a.md` } },
        { groupId: 'root', index: 1, tab: tab('b') },
    ];

    it('forgets what was deleted, and everything under a deleted folder', () => {
        expect(names(closedWithout(closed, `${DOCS}/guides`))).toEqual(['root:1:b']);
    });

    it('follows a rename, folder included, and leaves the rest as it was', () => {
        const moved = closedMoved(closed, `${DOCS}/guides`, `${DOCS}/manuals`);

        expect(moved[0]?.tab.resource).toBe(`${DOCS}/manuals/a.md`);
        expect(moved[1]).toBe(closed[1]);
    });
});
