import { createFakeBridge } from '@mandor/ipc/testing';
import { leavesOf, ROOT_GROUP_ID } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import type { Tab } from '../../src/index.js';
import { createShellStore, type ShellStoreApi } from '../../src/shell-store.js';

const ONE = 'mandor://demo/payments/doc/one.md';

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

describe('the group actions of the shell store', () => {
    it('focuses a group by the place it has in the window', () => {
        const api = store();
        const right = api.getState().splitGroup(ROOT_GROUP_ID, 'row');

        api.getState().focusGroupAt(1);

        expect(api.getState().activeGroupId).toBe(right);

        api.getState().focusGroupAt(7);

        expect(api.getState().activeGroupId).toBe(right);
    });

    it('opens beside the focused group, in the neighbour it already has', () => {
        const api = store();
        const right = api.getState().splitGroup(ROOT_GROUP_ID, 'row');

        api.getState().openTabAside(tab('one', ONE));

        expect(tabIds(api, right)).toEqual(['one']);
        expect(tabIds(api, ROOT_GROUP_ID)).toEqual([]);
    });

    /** With nowhere to open beside, the window makes the place first. */
    it('splits the window when the group that is focused has no neighbour', () => {
        const api = store();

        api.getState().openTabAside(tab('one', ONE));

        const [left, right] = groupIds(api);

        expect(left).toBe(ROOT_GROUP_ID);
        expect(right).toBeDefined();
        expect(tabIds(api, right ?? '')).toEqual(['one']);
    });

    it('maximises the focused group and gives the same shares back when it is restored', () => {
        const api = store();

        api.getState().splitGroup(ROOT_GROUP_ID, 'row');
        api.getState().resizeGrid([], 0, 15);

        const before = api.getState().grid;

        api.getState().toggleMaximized();

        expect(api.getState().maximizedGroupId).toBe(ROOT_GROUP_ID);

        api.getState().toggleMaximized();

        expect(api.getState().maximizedGroupId).toBeNull();
        expect(api.getState().grid).toEqual(before);
    });

    it('stops maximising a group that is no longer in the window', () => {
        const api = store();
        const right = api.getState().splitGroup(ROOT_GROUP_ID, 'row');

        api.getState().focusGroup(right);
        api.getState().toggleMaximized();
        api.getState().closeGroup(right);

        expect(api.getState().maximizedGroupId).toBeNull();
    });

    it('leaves the root empty when the only group of the window is closed', () => {
        const api = store();

        api.getState().openTab(ROOT_GROUP_ID, tab('one', ONE));
        api.getState().closeGroup(ROOT_GROUP_ID);

        expect(groupIds(api)).toEqual([ROOT_GROUP_ID]);
        expect(tabIds(api, ROOT_GROUP_ID)).toEqual([]);
        expect(api.getState().activeGroupId).toBe(ROOT_GROUP_ID);
    });
});
