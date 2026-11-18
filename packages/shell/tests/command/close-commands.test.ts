import { createFakeBridge } from '@mandor/ipc/testing';
import { leavesOf, ROOT_GROUP_ID } from '@mandor/ipc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    availableCommands,
    DEFAULT_SHORTCUTS,
    registerShellCommands,
    type Tab,
} from '../../src/index.js';
import { createShellStore, type ShellStoreApi } from '../../src/shell-store.js';
import { declareTabKindSpec } from '../../src/testing/tab-kind.js';

let undoCommands: () => void;
let undoKinds: () => void;

function tab(id: string): Tab {
    return { id, kind: 'doc', resource: `mandor://demo/payments/doc/${id}.md` };
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

describe('the three ways the window closes what it is showing', () => {
    it('closes the tab the focused group is showing', () => {
        const api = store();

        expect(isAvailable(api, 'tab.close')).toBe(false);

        api.getState().openTab(ROOT_GROUP_ID, tab('one'));

        run(api, 'tab.close');

        expect(tabIds(api, ROOT_GROUP_ID)).toEqual([]);
    });

    /** Clearing a group down to what is being read, without going through its strip tab by tab. */
    it('closes the other tabs of the focused group and keeps the one it shows', () => {
        const api = store();

        api.getState().openTab(ROOT_GROUP_ID, tab('one'));

        expect(isAvailable(api, 'tab.closeOthers')).toBe(false);

        api.getState().openTab(ROOT_GROUP_ID, tab('two'));
        api.getState().openTab(ROOT_GROUP_ID, tab('three'));
        api.getState().setActiveTab(ROOT_GROUP_ID, 'two');
        run(api, 'tab.closeOthers');

        expect(tabIds(api, ROOT_GROUP_ID)).toEqual(['two']);
    });

    /** A window with one group has nothing to close: closing it would leave nowhere to draw. */
    it('offers closing a group only once the window has more than one', () => {
        const api = store();

        expect(isAvailable(api, 'group.close')).toBe(false);

        run(api, 'group.splitRight');

        expect(isAvailable(api, 'group.close')).toBe(true);
    });

    it('gives each of the three a combination of its own', () => {
        const commands = DEFAULT_SHORTCUTS.map((shortcut) => shortcut.command);

        expect(commands).toContain('tab.close');
        expect(commands).toContain('tab.closeOthers');
        expect(commands).toContain('group.close');
    });
});

describe('the closing that a kind asks about first', () => {
    function registerAsking(answer: boolean): void {
        undoKinds();
        undoKinds = declareTabKindSpec({
            beforeClose: vi.fn().mockResolvedValue(answer),
            closable: true,
            icon: 'doc',
            id: 'doc',
            title: (resource) => resource,
        });
    }

    it('closes the shown tab once its kind agrees', async () => {
        const api = store();

        registerAsking(true);
        api.getState().openTab(ROOT_GROUP_ID, tab('one'));
        run(api, 'tab.close');

        await vi.waitFor(() => {
            expect(tabIds(api, ROOT_GROUP_ID)).toEqual([]);
        });
    });

    it('keeps the shown tab when its kind refuses', async () => {
        const api = store();

        registerAsking(false);
        api.getState().openTab(ROOT_GROUP_ID, tab('one'));
        run(api, 'tab.close');
        await Promise.resolve();

        expect(tabIds(api, ROOT_GROUP_ID)).toEqual(['one']);
    });

    it('keeps all the other tabs when one of them refuses', async () => {
        const api = store();

        registerAsking(false);
        api.getState().openTab(ROOT_GROUP_ID, tab('one'));
        api.getState().openTab(ROOT_GROUP_ID, tab('two'));
        api.getState().openTab(ROOT_GROUP_ID, tab('three'));
        api.getState().setActiveTab(ROOT_GROUP_ID, 'two');
        run(api, 'tab.closeOthers');
        await Promise.resolve();

        expect(tabIds(api, ROOT_GROUP_ID)).toEqual(['one', 'two', 'three']);
    });

    it('keeps a group whose tab refuses', async () => {
        const api = store();

        registerAsking(false);
        run(api, 'group.splitRight');
        api.getState().openTab(api.getState().activeGroupId, tab('one'));
        run(api, 'group.close');
        await Promise.resolve();

        expect(leavesOf(api.getState().grid)).toHaveLength(2);
    });
});

describe('keeping the tab opened only to look at it', () => {
    it('is offered while the shown tab is a look, and keeps it', () => {
        const api = store();

        api.getState().openTab(ROOT_GROUP_ID, tab('one'), { preview: true });

        expect(isAvailable(api, 'tab.keepOpen')).toBe(true);

        run(api, 'tab.keepOpen');

        expect(JSON.stringify(api.getState().grid)).not.toContain('preview');
        expect(isAvailable(api, 'tab.keepOpen')).toBe(false);
    });

    it('answers to the chord of the window', () => {
        expect(DEFAULT_SHORTCUTS).toContainEqual({
            combination: '$mod+KeyK Enter',
            command: 'tab.keepOpen',
            scope: 'window',
        });
    });
});
