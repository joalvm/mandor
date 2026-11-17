import { createFakeBridge } from '@mandor/ipc/testing';
import { leavesOf, ROOT_GROUP_ID } from '@mandor/ipc';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { availableCommands, registerShellCommands, type Tab } from '../../src/index.js';
import { createShellStore, type ShellStoreApi } from '../../src/shell-store.js';
import { declareTabKindSpec } from '../../src/testing/tab-kind.js';

const ONE = 'mandor://demo/payments/doc/one.md';

let undoCommands: () => void;
let undoKinds: () => void;

function tab(id: string, resource: string): Tab {
    return { id, kind: 'doc', resource };
}

function store(): ShellStoreApi {
    return createShellStore(createFakeBridge());
}

function run(api: ShellStoreApi, id: string): void {
    const command = availableCommands(api.getState()).find((each) => each.id === id);

    expect(command, `command ${id} is not available`).toBeDefined();
    command?.run(api.getState());
}

function isAvailable(api: ShellStoreApi, id: string): boolean {
    return availableCommands(api.getState()).some((command) => command.id === id);
}

function groupIds(api: ShellStoreApi): string[] {
    return leavesOf(api.getState().grid).map((leaf) => leaf.id);
}

function tabIds(api: ShellStoreApi, groupId: string): string[] {
    const leaf = leavesOf(api.getState().grid).find((group) => group.id === groupId);

    return leaf === undefined ? [] : leaf.tabs.map((each) => each.id);
}

beforeEach(() => {
    undoCommands = registerShellCommands();
    undoKinds = declareTabKindSpec({
        closable: true,
        icon: 'doc',
        id: 'doc',
        title: (resource) => resource,
    });
});

afterEach(() => {
    undoKinds();
    undoCommands();
});

describe('the commands the shell registers for its own grid', () => {
    it('splits the focused group along each of the two axes', () => {
        const api = store();

        run(api, 'group.splitRight');

        expect(api.getState().grid.kind).toBe('branch');
        expect(groupIds(api)).toHaveLength(2);

        run(api, 'group.splitDown');

        expect(groupIds(api)).toHaveLength(3);
    });

    it('lists one focus command per group the window has, and no more', () => {
        const api = store();

        expect(isAvailable(api, 'group.focus.1')).toBe(true);
        expect(isAvailable(api, 'group.focus.2')).toBe(false);

        run(api, 'group.splitRight');

        expect(isAvailable(api, 'group.focus.2')).toBe(true);

        run(api, 'group.focus.2');

        expect(api.getState().activeGroupId).toBe(groupIds(api)[1]);
    });

    it('maximises the focused group and gives the window back on a second run', () => {
        const api = store();

        run(api, 'group.splitRight');
        run(api, 'group.toggleMaximized');

        expect(api.getState().maximizedGroupId).toBe(ROOT_GROUP_ID);

        run(api, 'group.toggleMaximized');

        expect(api.getState().maximizedGroupId).toBeNull();
    });

    it('moves the tab the focused group is showing into the group beside it', () => {
        const api = store();

        api.getState().openTab(ROOT_GROUP_ID, tab('one', ONE));

        expect(isAvailable(api, 'tab.moveAside')).toBe(false);

        const right = api.getState().splitGroup(ROOT_GROUP_ID, 'row');

        api.getState().focusGroup(ROOT_GROUP_ID);
        run(api, 'tab.moveAside');

        expect(tabIds(api, right)).toEqual(['one']);
        expect(tabIds(api, ROOT_GROUP_ID)).toEqual([]);
    });

    /** Two views of one resource is the whole point of a grid: the same doc, left and right. */
    it('opens a second view of the shown resource beside, making the room when there is none', () => {
        const api = store();

        api.getState().openTab(ROOT_GROUP_ID, tab('one', ONE));
        run(api, 'tab.openAside');

        const [, right] = groupIds(api);

        expect(tabIds(api, ROOT_GROUP_ID)).toEqual(['one']);
        expect(tabIds(api, right ?? '')).toEqual(['one#2']);
        expect(api.getState().resources[ONE]?.tabs).toEqual(['one', 'one#2']);
    });
});
