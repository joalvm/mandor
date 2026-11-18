import { createFakeBridge } from '@mandor/ipc/testing';
import { leavesOf, ROOT_GROUP_ID } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { TAB_WALK_COMMANDS } from '../../src/command/tab-walk-commands.js';
import { createShellStore, type ShellStoreApi } from '../../src/shell-store.js';

function doc(id: string) {
    return { id, kind: 'doc', resource: `mandor://demo/payments/doc/${id}.md` };
}

function storeWith(...ids: string[]): ShellStoreApi {
    const api = createShellStore(createFakeBridge());

    for (const id of ids) {
        api.getState().openTab(ROOT_GROUP_ID, doc(id));
    }

    return api;
}

/** Runs a command the way a shortcut does: only when it applies. */
function run(api: ShellStoreApi, id: string): boolean {
    const command = TAB_WALK_COMMANDS.find((each) => each.id === id);
    const state = api.getState();

    if (command === undefined || command.when?.(state) === false) {
        return false;
    }

    command.run(state);

    return true;
}

function strip(api: ShellStoreApi): string[] {
    return leavesOf(api.getState().grid).flatMap((leaf) => leaf.tabs.map((tab) => tab.id));
}

function shown(api: ShellStoreApi): string | null {
    return leavesOf(api.getState().grid)[0]?.activeTab ?? null;
}

describe('reopening what was closed', () => {
    it('brings back the last tab closed, to its place, until there is nothing left', () => {
        const api = storeWith('a', 'b', 'c');

        api.getState().closeTab(ROOT_GROUP_ID, 'b');
        api.getState().closeTab(ROOT_GROUP_ID, 'a');

        expect(run(api, 'tab.reopen')).toBe(true);
        expect(strip(api)).toEqual(['a', 'c']);
        expect(run(api, 'tab.reopen')).toBe(true);
        expect(strip(api)).toEqual(['a', 'b', 'c']);
        expect(shown(api)).toBe('b');
        expect(run(api, 'tab.reopen')).toBe(false);
    });

    it('opens in the focused group a tab whose group is gone', () => {
        const api = storeWith('a');
        const beside = api.getState().splitGroup(ROOT_GROUP_ID, 'row');

        api.getState().openTab(beside, doc('b'));
        api.getState().closeTab(beside, 'b');
        run(api, 'tab.reopen');

        expect(leavesOf(api.getState().grid).map((leaf) => leaf.id)).toEqual([ROOT_GROUP_ID]);
        expect(strip(api)).toEqual(['a', 'b']);
    });
});

describe('moving along the strip', () => {
    it('goes to the next and the previous tab, round the ends', () => {
        const api = storeWith('a', 'b', 'c');

        run(api, 'tab.next');
        expect(shown(api)).toBe('a');
        run(api, 'tab.previous');
        expect(shown(api)).toBe('c');
    });

    it('moves the tab in front one place, never across the pinned', () => {
        const api = storeWith('a', 'b', 'c');

        api.getState().pinTab('a');
        run(api, 'tab.moveLeft');
        expect(strip(api)).toEqual(['a', 'c', 'b']);
        expect(run(api, 'tab.moveLeft')).toBe(false);
        expect(run(api, 'tab.moveRight')).toBe(true);
        expect(strip(api)).toEqual(['a', 'b', 'c']);
    });
});

describe('going back to the tab used before', () => {
    /** With the modifier held the order stands still, so each press goes one further. */
    it('walks down the order of use and makes the tab reached the last one used', () => {
        const api = storeWith('a', 'b', 'c');

        api.getState().setActiveTab(ROOT_GROUP_ID, 'a');
        run(api, 'tab.recent');
        expect(shown(api)).toBe('c');
        run(api, 'tab.recent');
        expect(shown(api)).toBe('b');
        api.getState().endRecentWalk();
        run(api, 'tab.recent');
        expect(shown(api)).toBe('a');
        run(api, 'tab.recentBack');
        expect(shown(api)).toBe('b');
    });
});
