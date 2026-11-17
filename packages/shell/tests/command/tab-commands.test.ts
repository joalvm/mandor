import { createFakeBridge } from '@mandor/ipc/testing';
import { leavesOf, ROOT_GROUP_ID } from '@mandor/ipc';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { TAB_COMMANDS } from '../../src/command/tab-commands.js';
import type { Tab } from '../../src/index.js';
import { createShellStore, type ShellStoreApi } from '../../src/shell-store.js';
import { declareTabKindSpec } from '../../src/testing/tab-kind.js';

const DIRTY = new Set<string>();

let undo: (() => void)[] = [];

function tab(id: string, kind = 'doc'): Tab {
    return { id, kind, resource: `mandor://demo/payments/doc/${id}.md` };
}

function storeWith(...tabs: Tab[]): ShellStoreApi {
    const api = createShellStore(createFakeBridge());

    for (const each of tabs) {
        api.getState().openTab(ROOT_GROUP_ID, each);
    }

    return api;
}

function find(id: string) {
    const command = TAB_COMMANDS.find((each) => each.id === id);

    expect(command, `command ${id} is declared`).toBeDefined();

    return command;
}

function applies(api: ShellStoreApi, id: string): boolean {
    return find(id)?.when?.(api.getState()) ?? true;
}

function run(api: ShellStoreApi, id: string): void {
    find(id)?.run(api.getState());
}

function tabIds(api: ShellStoreApi, groupId = ROOT_GROUP_ID): string[] {
    const leaf = leavesOf(api.getState().grid).find((group) => group.id === groupId);

    return leaf === undefined ? [] : leaf.tabs.map((each) => each.id);
}

function show(api: ShellStoreApi, tabId: string): void {
    api.getState().setActiveTab(ROOT_GROUP_ID, tabId);
}

beforeEach(() => {
    undo = [
        declareTabKindSpec({
            closable: true,
            icon: 'doc',
            id: 'doc',
            section: 'docs',
            title: (resource) => resource,
        }),
        declareTabKindSpec({
            closable: true,
            dirty: (tabId) => DIRTY.has(tabId),
            icon: 'doc',
            id: 'editable',
            title: (resource) => resource,
        }),
        declareTabKindSpec({
            closable: false,
            icon: 'doc',
            id: 'fixed',
            title: (resource) => resource,
        }),
    ];
});

afterEach(() => {
    DIRTY.clear();

    for (const each of undo) {
        each();
    }
});

describe('the commands on the tab in front', () => {
    it('closes the tab in front, and is offered only when its kind lets it close', async () => {
        const api = storeWith(tab('a'), tab('b'), tab('pinned', 'fixed'));

        show(api, 'pinned');

        expect(applies(api, 'tab.close')).toBe(false);

        show(api, 'b');

        expect(applies(api, 'tab.close')).toBe(true);

        run(api, 'tab.close');
        await expect.poll(() => tabIds(api)).toEqual(['a', 'pinned']);
    });

    it('pins the tab in front and unpins it, each only while it applies', () => {
        const api = storeWith(tab('a'), tab('b'));

        show(api, 'b');

        expect(applies(api, 'tab.pin')).toBe(true);
        expect(applies(api, 'tab.unpin')).toBe(false);

        run(api, 'tab.pin');

        expect(applies(api, 'tab.pin')).toBe(false);
        expect(applies(api, 'tab.unpin')).toBe(true);

        run(api, 'tab.unpin');

        expect(applies(api, 'tab.pin')).toBe(true);
    });

    it('keeps open a tab that was only a look, and offers it for nothing else', () => {
        const api = storeWith(tab('a'));

        expect(applies(api, 'tab.keepOpen')).toBe(false);

        api.getState().openTab(ROOT_GROUP_ID, tab('look'), { preview: true });

        expect(applies(api, 'tab.keepOpen')).toBe(true);

        run(api, 'tab.keepOpen');

        expect(applies(api, 'tab.keepOpen')).toBe(false);
    });

    it('does nothing, and offers nothing, while no tab is in front', () => {
        const api = storeWith();

        for (const id of ['tab.close', 'tab.pin', 'tab.openAside', 'tab.reveal']) {
            expect(applies(api, id)).toBe(false);
        }
    });
});

describe('the commands that close a part of the group', () => {
    it('closes every other tab but spares a pinned one', async () => {
        const api = storeWith(tab('a'), tab('b'), tab('c'));

        api.getState().pinTab('a');
        show(api, 'b');
        run(api, 'tab.closeOthers');
        await expect.poll(() => tabIds(api)).toEqual(['a', 'b']);
    });

    it('closes what stands to the right of the tab in front', async () => {
        const api = storeWith(tab('a'), tab('b'), tab('c'));

        show(api, 'b');

        expect(applies(api, 'tab.closeRight')).toBe(true);

        run(api, 'tab.closeRight');
        await expect.poll(() => tabIds(api)).toEqual(['a', 'b']);
        expect(applies(api, 'tab.closeRight')).toBe(false);
    });

    it('closes the saved tabs only when something in the group is not saved', async () => {
        const api = storeWith(tab('a', 'editable'), tab('b', 'editable'));

        expect(applies(api, 'tab.closeSaved')).toBe(false);

        DIRTY.add('b');

        expect(applies(api, 'tab.closeSaved')).toBe(true);

        run(api, 'tab.closeSaved');
        await expect.poll(() => tabIds(api)).toEqual(['b']);
    });

    it('closes all that can be closed and leaves a tab its kind keeps', async () => {
        const api = storeWith(tab('a'), tab('b'), tab('fixed', 'fixed'));

        run(api, 'tab.closeAll');
        await expect.poll(() => tabIds(api)).toEqual(['fixed']);
        expect(applies(api, 'tab.closeAll')).toBe(false);
    });
});

describe('the commands that open the tab in front somewhere else', () => {
    it('moves the tab to the group beside, only when there is one', () => {
        const api = storeWith(tab('a'));

        expect(applies(api, 'tab.moveAside')).toBe(false);

        const beside = api.getState().splitGroup(ROOT_GROUP_ID, 'row');

        api.getState().focusGroup(ROOT_GROUP_ID);

        expect(applies(api, 'tab.moveAside')).toBe(true);

        run(api, 'tab.moveAside');

        expect(tabIds(api, beside)).toEqual(['a']);
    });

    it('opens another view that takes the lowest free number', () => {
        const api = storeWith(tab('a'));

        run(api, 'tab.openAside');

        const [, beside] = leavesOf(api.getState().grid);

        expect(beside?.tabs.map((each) => each.id)).toEqual(['a#2']);

        api.getState().focusGroup(ROOT_GROUP_ID);
        run(api, 'tab.openAside');

        const groups = leavesOf(api.getState().grid);

        expect(groups.flatMap((group) => group.tabs.map((each) => each.id)).toSorted()).toEqual([
            'a',
            'a#2',
            'a#3',
        ]);
    });

    it('keeps the view beside it opened even when the tab it came from was a look', () => {
        const api = storeWith();

        api.getState().openTab(ROOT_GROUP_ID, tab('look'), { preview: true });
        run(api, 'tab.openAside');

        const leaves = leavesOf(api.getState().grid);

        expect(leaves.flatMap((leaf) => leaf.tabs).find((each) => each.id === 'look#2')).toEqual({
            ...tab('look'),
            id: 'look#2',
        });
    });
});

describe('showing the tab in the sidebar', () => {
    it('is offered for a kind a section lists, and opens that section on the tab', () => {
        const api = storeWith(tab('a'), tab('plain', 'fixed'));

        show(api, 'plain');

        expect(applies(api, 'tab.reveal')).toBe(false);

        show(api, 'a');
        api.getState().setPanels({ collapsedSections: ['docs', 'other'] });

        expect(applies(api, 'tab.reveal')).toBe(true);

        run(api, 'tab.reveal');

        expect(api.getState().panels.collapsedSections).toEqual(['other']);
        expect(api.getState().revealing).toBe(tab('a').resource);
    });
});
