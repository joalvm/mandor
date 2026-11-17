import { createFakeBridge } from '@mandor/ipc/testing';
import { leavesOf, ROOT_GROUP_ID } from '@mandor/ipc';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { availableCommands, registerShellCommands, type Tab } from '../../src/index.js';
import { createShellStore, type ShellStoreApi } from '../../src/shell-store.js';
import { declareTabKindSpec } from '../../src/testing/tab-kind.js';

let undoCommands: () => void;
let undoKinds: (() => void)[] = [];

/** The tabs of a kind that waits to be saved, and which of them hold what is not on disk yet. */
const unsaved = new Set<string>();

function doc(id: string): Tab {
    return { id, kind: 'doc', resource: `mandor://demo/payments/doc/${id}.md` };
}

function request(id: string): Tab {
    return { id, kind: 'request', resource: `mandor://demo/payments/item/${id}.yaml` };
}

function store(...tabs: Tab[]): ShellStoreApi {
    const api = createShellStore(createFakeBridge());

    for (const each of tabs) {
        api.getState().openTab(ROOT_GROUP_ID, each);
    }

    return api;
}

function run(api: ShellStoreApi, id: string): void {
    const command = availableCommands(api.getState()).find((each) => each.id === id);

    expect(command, `command ${id} is not available`).toBeDefined();
    command?.run(api.getState());
}

function isAvailable(api: ShellStoreApi, id: string): boolean {
    return availableCommands(api.getState()).some((command) => command.id === id);
}

function tabIds(api: ShellStoreApi): string[] {
    return leavesOf(api.getState().grid)[0]?.tabs.map((each) => each.id) ?? [];
}

beforeEach(() => {
    undoCommands = registerShellCommands();
    undoKinds = [
        declareTabKindSpec({
            closable: true,
            icon: 'doc',
            id: 'doc',
            section: 'docs',
            title: (resource) => resource,
        }),
        declareTabKindSpec({
            closable: true,
            dirty: (tabId) => unsaved.has(tabId),
            icon: 'send',
            id: 'request',
            title: (resource) => resource,
        }),
    ];
});

afterEach(() => {
    for (const undo of undoKinds) {
        undo();
    }

    undoCommands();
    unsaved.clear();
});

describe('closing many tabs of the group at once', () => {
    it('closes what stands to the right of the tab in front and nothing before it', () => {
        const api = store(doc('one'), doc('two'), doc('three'));

        expect(isAvailable(api, 'tab.closeRight')).toBe(false);

        api.getState().setActiveTab(ROOT_GROUP_ID, 'one');
        run(api, 'tab.closeRight');

        expect(tabIds(api)).toEqual(['one']);
    });

    it('closes every tab of the group', () => {
        const api = store(doc('one'), doc('two'));

        run(api, 'tab.closeAll');

        expect(tabIds(api)).toEqual([]);
        expect(isAvailable(api, 'tab.closeAll')).toBe(false);
    });

    /** Only a kind that waits to be saved can leave work behind: the rest go with the saved. */
    it('closes the saved tabs and leaves the one with work that is not on disk', () => {
        const api = store(doc('readme'), request('draft'), request('clean'));

        expect(isAvailable(api, 'tab.closeSaved')).toBe(false);

        unsaved.add('draft');
        run(api, 'tab.closeSaved');

        expect(tabIds(api)).toEqual(['draft']);
    });
});

describe('showing the tab in the lateral', () => {
    it('opens the section of its kind and says which resource to show', () => {
        const api = store(doc('readme'));

        api.getState().setPanels({ collapsedSections: ['docs', 'collection'] });
        run(api, 'tab.reveal');

        expect(api.getState().panels.collapsedSections).toEqual(['collection']);
        expect(api.getState().revealing).toBe(doc('readme').resource);
    });

    it('is not offered for a kind no section of the lateral lists', () => {
        const api = store(request('draft'));

        expect(isAvailable(api, 'tab.reveal')).toBe(false);
    });
});
