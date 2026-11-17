import type { GridLeaf } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import {
    isPreviewTab,
    keptTab,
    previewTabOf,
    withKeptTab,
    withPreviewTab,
    withReorderedTabs,
} from '../../src/grid/leaf-preview.js';

const RESOURCE = 'mandor://demo/payments/collection/a.yaml';

function tab(id: string, preview?: true) {
    return preview === undefined
        ? { id, kind: 'item', resource: `${RESOURCE}#${id}` }
        : { id, kind: 'item', preview, resource: `${RESOURCE}#${id}` };
}

function leaf(...tabs: ReturnType<typeof tab>[]): GridLeaf {
    return { activeTab: tabs[0]?.id ?? null, id: 'root', kind: 'leaf', tabs };
}

function ids(group: GridLeaf): string[] {
    return group.tabs.map((each) => (each.preview === true ? `${each.id}*` : each.id));
}

describe('opening a tab to look at it', () => {
    it('adds it at the end, provisional, when the group has no provisional tab', () => {
        const opened = withPreviewTab(leaf(tab('a')), tab('b'));

        expect(ids(opened)).toEqual(['a', 'b*']);
        expect(opened.activeTab).toBe('b');
    });

    /** The place does not jump: the next look lands where the last one was. */
    it('takes the place of the provisional tab the group already had', () => {
        const opened = withPreviewTab(leaf(tab('a'), tab('b', true), tab('c')), tab('d'));

        expect(ids(opened)).toEqual(['a', 'd*', 'c']);
        expect(opened.activeTab).toBe('d');
    });

    it('only shows a tab that is already open, and leaves it as it was', () => {
        const group = leaf(tab('a'), tab('b', true));
        const opened = withPreviewTab(group, tab('a'));

        expect(ids(opened)).toEqual(['a', 'b*']);
        expect(opened.activeTab).toBe('a');
    });

    it('names the provisional tab of a group, or nothing', () => {
        expect(previewTabOf(leaf(tab('a'), tab('b', true)))?.id).toBe('b');
        expect(previewTabOf(leaf(tab('a')))).toBeUndefined();
    });
});

describe('keeping a tab', () => {
    it('turns the provisional tab into a permanent one in its place', () => {
        const kept = withKeptTab(leaf(tab('a'), tab('b', true)), 'b');

        expect(ids(kept)).toEqual(['a', 'b']);
    });

    it('hands back the same group when there is nothing to keep', () => {
        const group = leaf(tab('a'));

        expect(withKeptTab(group, 'a')).toBe(group);
        expect(withKeptTab(group, 'gone')).toBe(group);
    });

    it('drops the mark and nothing else', () => {
        expect(keptTab(tab('b', true))).toEqual(tab('b'));
    });

    it('says whether a tab anywhere in the window is provisional', () => {
        const grid = leaf(tab('a'), tab('b', true));

        expect(isPreviewTab(grid, 'b')).toBe(true);
        expect(isPreviewTab(grid, 'a')).toBe(false);
        expect(isPreviewTab(grid, 'gone')).toBe(false);
    });
});

describe('reordering a strip', () => {
    /** Dragging the provisional tab is choosing it: VS Code keeps it too. */
    it('keeps the provisional tab when it is the one dragged', () => {
        const moved = withReorderedTabs(leaf(tab('a'), tab('b'), tab('c', true)), ['c', 'a', 'b']);

        expect(ids(moved)).toEqual(['c', 'a', 'b']);
    });

    it('leaves it provisional when another tab is dragged past it', () => {
        const moved = withReorderedTabs(leaf(tab('a'), tab('b', true), tab('c')), ['b', 'c', 'a']);

        expect(ids(moved)).toEqual(['b*', 'c', 'a']);
    });

    it('ignores an order naming anything the group does not hold', () => {
        const group = leaf(tab('a'), tab('b', true));

        expect(withReorderedTabs(group, ['b', 'x'])).toBe(group);
    });
});
