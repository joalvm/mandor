import type { GridLeaf } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import {
    withActiveTab,
    withoutTab,
    withTab,
    withTabAt,
    withTabOrder,
} from '../../src/grid/leaf-tabs.js';
import type { Tab } from '../../src/tab/tab.js';

function tab(id: string, pinned?: true): Tab {
    return pinned === undefined
        ? { id, kind: 'doc', resource: `mandor://demo/${id}` }
        : { id, kind: 'doc', pinned, resource: `mandor://demo/${id}` };
}

function leaf(active: string | null, ...tabs: Tab[]): GridLeaf {
    return { activeTab: active, id: 'root', kind: 'leaf', tabs };
}

function ids(group: GridLeaf): string[] {
    return group.tabs.map((each) => each.id);
}

describe('opening a tab in a group', () => {
    it('adds it at the end and shows it', () => {
        const next = withTab(leaf('a', tab('a')), tab('b'));

        expect(ids(next)).toEqual(['a', 'b']);
        expect(next.activeTab).toBe('b');
    });

    it('shows again a tab that is already open instead of holding it twice', () => {
        const next = withTab(leaf('a', tab('a'), tab('b')), tab('b'));

        expect(ids(next)).toEqual(['a', 'b']);
        expect(next.activeTab).toBe('b');
    });

    it('puts a tab back where it stood, or at the end of a strip that is shorter now', () => {
        const group = leaf('a', tab('a'), tab('c'));

        expect(ids(withTabAt(group, tab('b'), 1))).toEqual(['a', 'b', 'c']);
        expect(ids(withTabAt(group, tab('z'), 9))).toEqual(['a', 'c', 'z']);
        expect(withTabAt(group, tab('b'), 1).activeTab).toBe('b');
    });
});

describe('closing a tab of a group', () => {
    it('shows the tab to the right of the one that was showing', () => {
        const next = withoutTab(leaf('b', tab('a'), tab('b'), tab('c')), 'b');

        expect(ids(next)).toEqual(['a', 'c']);
        expect(next.activeTab).toBe('c');
    });

    it('falls back to the left only when the last tab was the one showing', () => {
        expect(withoutTab(leaf('c', tab('a'), tab('b'), tab('c')), 'c').activeTab).toBe('b');
    });

    it('shows nothing once the only tab is closed', () => {
        expect(withoutTab(leaf('a', tab('a')), 'a').activeTab).toBeNull();
    });

    it('keeps showing what was showing when another tab goes', () => {
        expect(withoutTab(leaf('a', tab('a'), tab('b')), 'b').activeTab).toBe('a');
    });

    it('changes nothing for a tab the group does not hold', () => {
        const group = leaf('a', tab('a'));

        expect(withoutTab(group, 'z')).toBe(group);
    });
});

describe('choosing the tab a group shows', () => {
    it('shows a tab the group holds, or none', () => {
        const group = leaf('a', tab('a'), tab('b'));

        expect(withActiveTab(group, 'b').activeTab).toBe('b');
        expect(withActiveTab(group, null).activeTab).toBeNull();
    });

    it('ignores a tab the group does not hold', () => {
        const group = leaf('a', tab('a'));

        expect(withActiveTab(group, 'z')).toBe(group);
    });
});

describe('ordering the tabs of a group', () => {
    it('applies the order asked for', () => {
        const next = withTabOrder(leaf('a', tab('a'), tab('b'), tab('c')), ['c', 'a', 'b']);

        expect(ids(next)).toEqual(['c', 'a', 'b']);
    });

    it('ignores an order that names what the group does not hold, whole', () => {
        const group = leaf('a', tab('a'), tab('b'));

        expect(withTabOrder(group, ['b', 'z'])).toBe(group);
        expect(withTabOrder(group, ['b'])).toBe(group);
    });

    it('keeps the pinned standing first whatever the order asks', () => {
        const group = leaf('a', tab('a', true), tab('b'), tab('c'));

        expect(ids(withTabOrder(group, ['c', 'b', 'a']))).toEqual(['a', 'c', 'b']);
    });
});
