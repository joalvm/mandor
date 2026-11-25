import { createFakeBridge } from '@mandor/ipc/testing';
import { leavesOf, ROOT_GROUP_ID } from '@mandor/ipc';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createShellStore, type ShellStoreApi } from '../../src/shell-store.js';
import type { TabActions } from '../../src/grid/tab-actions.js';
import { tabPreferences } from '../../src/tab/tab-preferences.js';
import { declareTabKindSpec } from '../../src/testing/tab-kind.js';

const ITEMS = 'mandor://demo/payments/collection';

const UNREGISTER: (() => void)[] = [];

function item(name: string) {
    return { id: name, kind: 'item', resource: `${ITEMS}/${name}.yaml` };
}

function store(): ShellStoreApi {
    return createShellStore(createFakeBridge());
}

/** The strip of the first group, with a star on what is only being looked at. */
function strip(api: ShellStoreApi, groupId = ROOT_GROUP_ID): string[] {
    const group = leavesOf(api.getState().grid).find((leaf) => leaf.id === groupId);

    return (group?.tabs ?? []).map((tab) => (tab.preview === true ? `${tab.id}*` : tab.id));
}

function look(api: ShellStoreApi, name: string): void {
    const open: TabActions['openTab'] = api.getState().openTab;

    open(ROOT_GROUP_ID, item(name), { preview: true });
}

afterEach(() => {
    for (const unregister of UNREGISTER.splice(0)) {
        unregister();
    }

    tabPreferences.setState(tabPreferences.getInitialState());
});

describe('looking at things one click at a time', () => {
    it('leaves a single provisional tab that changes with every look', () => {
        const api = store();

        api.getState().openTab(ROOT_GROUP_ID, item('kept'));
        look(api, 'a');
        look(api, 'b');
        look(api, 'c');

        expect(strip(api)).toEqual(['kept', 'c*']);
    });

    it('opens a tab that stays for every look, for whoever always wants a new tab', () => {
        const api = store();

        tabPreferences.setState({ alwaysNew: true });
        look(api, 'a');
        look(api, 'b');

        expect(strip(api)).toEqual(['a', 'b']);
    });

    it('lets go of what the replaced look was holding', () => {
        const release = vi.fn();
        const api = store();

        UNREGISTER.push(
            declareTabKindSpec({
                closable: true,
                icon: 'file',
                id: 'item',
                release,
                title: () => '',
            }),
        );
        look(api, 'a');
        look(api, 'b');

        expect(release).toHaveBeenCalledExactlyOnceWith('a', `${ITEMS}/a.yaml`);
    });

    it('keeps a look asked for again to keep', () => {
        const api = store();

        look(api, 'a');
        api.getState().openTab(ROOT_GROUP_ID, item('a'));

        expect(strip(api)).toEqual(['a']);
    });

    it('does not turn a kept tab back into a look', () => {
        const api = store();

        api.getState().openTab(ROOT_GROUP_ID, item('a'));
        look(api, 'a');

        expect(strip(api)).toEqual(['a']);
    });
});

describe('keeping a tab', () => {
    it('keeps the look in its place, and the next look opens beside it', () => {
        const api = store();

        look(api, 'a');
        api.getState().keepTab('a');
        look(api, 'b');

        expect(strip(api)).toEqual(['a', 'b*']);
    });

    /** Every edit asks; only the first one may cost a save. */
    it('changes nothing for a tab that is already kept', () => {
        const api = store();

        api.getState().openTab(ROOT_GROUP_ID, item('a'));

        const before = api.getState().grid;

        api.getState().keepTab('a');

        expect(api.getState().grid).toBe(before);
    });

    it('keeps the look carried to another group', () => {
        const api = store();
        const beside = api.getState().splitGroup(ROOT_GROUP_ID, 'row');

        look(api, 'a');
        api.getState().openTab(ROOT_GROUP_ID, item('b'));
        api.getState().moveTab('a', beside);

        expect(strip(api, beside)).toEqual(['a']);
    });

    it('keeps the look dragged to another place of its strip', () => {
        const api = store();

        api.getState().openTab(ROOT_GROUP_ID, item('a'));
        look(api, 'b');
        api.getState().setTabOrder(ROOT_GROUP_ID, ['b', 'a']);

        expect(strip(api)).toEqual(['b', 'a']);
    });
});

describe('a tab just born', () => {
    it('is marked when it comes into the grid, and not when it was already there', () => {
        const api = store();

        api.getState().openTab(ROOT_GROUP_ID, item('a'));

        expect(api.getState().openedTabId).toBe('a');

        api.setState({ openedTabId: null });
        api.getState().openTab(ROOT_GROUP_ID, item('a'));

        expect(api.getState().openedTabId).toBeNull();
    });
});
