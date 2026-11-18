import { createFakeBridge } from '@mandor/ipc/testing';
import { leavesOf, ROOT_GROUP_ID } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import type { Tab } from '../../src/index.js';
import { createShellStore, type ShellStoreApi } from '../../src/shell-store.js';

const ONE = 'mandor://demo/payments/doc/one.md';
const TWO = 'mandor://demo/payments/doc/two.md';

function tab(id: string, resource: string): Tab {
    return { id, kind: 'doc', resource };
}

function store(): ShellStoreApi {
    return createShellStore(createFakeBridge());
}

function groupIds(api: ShellStoreApi): string[] {
    return leavesOf(api.getState().grid).map((leaf) => leaf.id);
}

function tabIds(api: ShellStoreApi, groupId: string): string[] {
    const leaf = leavesOf(api.getState().grid).find((group) => group.id === groupId);

    return leaf === undefined ? [] : leaf.tabs.map((each) => each.id);
}

describe('the grid actions of the shell store', () => {
    it('opens a tab in the group it was told and shows it there', () => {
        const api = store();

        api.getState().openTab(ROOT_GROUP_ID, tab('one', ONE));

        expect(tabIds(api, ROOT_GROUP_ID)).toEqual(['one']);
        expect(leavesOf(api.getState().grid)[0]?.activeTab).toBe('one');
    });

    it('focuses a tab that is already open instead of opening it twice', () => {
        const api = store();
        const right = api.getState().splitGroup(ROOT_GROUP_ID, 'row');

        api.getState().openTab(right, tab('one', ONE));
        api.getState().focusGroup(ROOT_GROUP_ID);
        api.getState().openTab(ROOT_GROUP_ID, tab('one', ONE));

        expect(tabIds(api, ROOT_GROUP_ID)).toEqual([]);
        expect(tabIds(api, right)).toEqual(['one']);
        expect(api.getState().activeGroupId).toBe(right);
    });

    it('shows the neighbour when the tab that was showing is closed', () => {
        const api = store();

        api.getState().openTab(ROOT_GROUP_ID, tab('one', ONE));
        api.getState().openTab(ROOT_GROUP_ID, tab('two', TWO));
        api.getState().closeTab(ROOT_GROUP_ID, 'two');

        expect(tabIds(api, ROOT_GROUP_ID)).toEqual(['one']);
        expect(leavesOf(api.getState().grid)[0]?.activeTab).toBe('one');
    });

    it('collapses the group that loses its last tab and leaves the root empty', () => {
        const api = store();
        const right = api.getState().splitGroup(ROOT_GROUP_ID, 'row');

        api.getState().openTab(right, tab('one', ONE));
        api.getState().openTab(ROOT_GROUP_ID, tab('two', TWO));
        api.getState().closeTab(right, 'one');

        expect(groupIds(api)).toEqual([ROOT_GROUP_ID]);
        expect(api.getState().activeGroupId).toBe(ROOT_GROUP_ID);
        // No branch left over the survivor: it draws at the full width of the window.
        expect(api.getState().grid.kind).toBe('leaf');

        api.getState().closeTab(ROOT_GROUP_ID, 'two');

        expect(groupIds(api)).toEqual([ROOT_GROUP_ID]);
        expect(tabIds(api, ROOT_GROUP_ID)).toEqual([]);
    });

    it('moves a tab to the group it was told', () => {
        const api = store();
        const right = api.getState().splitGroup(ROOT_GROUP_ID, 'row');

        api.getState().openTab(ROOT_GROUP_ID, tab('one', ONE));
        api.getState().openTab(ROOT_GROUP_ID, tab('two', TWO));
        api.getState().moveTab('two', right);

        expect(tabIds(api, ROOT_GROUP_ID)).toEqual(['one']);
        expect(tabIds(api, right)).toEqual(['two']);
    });

    it('splits a group into a branch with a new empty group beside it', () => {
        const api = store();
        const right = api.getState().splitGroup(ROOT_GROUP_ID, 'column');
        const grid = api.getState().grid;

        expect(grid.kind).toBe('branch');
        expect(grid.kind === 'branch' ? grid.axis : null).toBe('column');
        expect(groupIds(api)).toEqual([ROOT_GROUP_ID, right]);
        expect(tabIds(api, right)).toEqual([]);
        expect(api.getState().activeGroupId).toBe(ROOT_GROUP_ID);
    });

    it('closes a group with its tabs and hands the focus to what is left', () => {
        const api = store();
        const right = api.getState().splitGroup(ROOT_GROUP_ID, 'row');

        api.getState().openTab(right, tab('one', ONE));
        api.getState().closeGroup(right);

        expect(groupIds(api)).toEqual([ROOT_GROUP_ID]);
        expect(api.getState().activeGroupId).toBe(ROOT_GROUP_ID);
        expect(api.getState().resources).toEqual({});
    });

    it('focuses a group and ignores one that no longer exists', () => {
        const api = store();
        const right = api.getState().splitGroup(ROOT_GROUP_ID, 'row');

        api.getState().focusGroup(right);

        expect(api.getState().activeGroupId).toBe(right);

        api.getState().focusGroup('nowhere');

        expect(api.getState().activeGroupId).toBe(right);
    });

    it('gives two tabs on the same resource one entry in the index', () => {
        const api = store();
        const right = api.getState().splitGroup(ROOT_GROUP_ID, 'row');

        api.getState().openTab(ROOT_GROUP_ID, tab('left-view', ONE));
        api.getState().openTab(right, tab('right-view', ONE));

        expect(api.getState().resources).toEqual({
            [ONE]: { missing: false, tabs: ['left-view', 'right-view'] },
        });

        api.getState().closeTab(right, 'right-view');

        expect(api.getState().resources).toEqual({
            [ONE]: { missing: false, tabs: ['left-view'] },
        });
    });
    it('splits twice along one axis into one row of three, never a row inside a row', () => {
        const api = store();

        api.getState().splitGroup(ROOT_GROUP_ID, 'row');
        api.getState().splitGroup(ROOT_GROUP_ID, 'row');

        expect(api.getState().grid).toMatchObject({
            kind: 'branch',
            axis: 'row',
            children: [{ kind: 'leaf' }, { kind: 'leaf' }, { kind: 'leaf' }],
        });
    });

    it('keeps a split of the other axis nested, because that is another arrangement', () => {
        const api = store();

        api.getState().splitGroup(ROOT_GROUP_ID, 'row');
        api.getState().splitGroup(ROOT_GROUP_ID, 'column');

        expect(api.getState().grid).toMatchObject({
            kind: 'branch',
            axis: 'row',
            children: [{ kind: 'branch', axis: 'column' }, { kind: 'leaf' }],
        });
    });

    it('moves a separator, and the shares it changed are the ones that get saved', () => {
        const api = store();

        api.getState().splitGroup(ROOT_GROUP_ID, 'row');
        api.getState().resizeGrid([], 0, 15);

        expect(api.getState().grid).toMatchObject({ kind: 'branch', sizes: [65, 35] });
    });

    it('leaves the shares alone when the separator moved is not there', () => {
        const api = store();

        api.getState().resizeGrid([], 0, 15);

        expect(api.getState().grid).toEqual({
            kind: 'leaf',
            id: ROOT_GROUP_ID,
            tabs: [],
            activeTab: null,
        });
    });
});
