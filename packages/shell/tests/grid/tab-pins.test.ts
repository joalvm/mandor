import { createFakeBridge } from '@mandor/ipc/testing';
import { leavesOf, ROOT_GROUP_ID } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { createShellStore, type ShellStoreApi } from '../../src/shell-store.js';

function item(name: string) {
    return { id: name, kind: 'item', resource: `mandor://demo/payments/collection/${name}.yaml` };
}

function storeWith(...names: string[]): ShellStoreApi {
    const api = createShellStore(createFakeBridge());

    for (const name of names) {
        api.getState().openTab(ROOT_GROUP_ID, item(name));
    }

    return api;
}

/** Every group's strip, with a pin before what is pinned. */
function strips(api: ShellStoreApi): string[][] {
    return leavesOf(api.getState().grid).map((leaf) =>
        leaf.tabs.map((tab) => (tab.pinned === true ? `^${tab.id}` : tab.id)),
    );
}

describe('the pinned tabs of a window', () => {
    it('stand first in their group, and go back among the rest when let go', () => {
        const api = storeWith('a', 'b', 'c');

        api.getState().pinTab('c');
        expect(strips(api)).toEqual([['^c', 'a', 'b']]);

        api.getState().unpinTab('c');
        expect(strips(api)).toEqual([['c', 'a', 'b']]);
    });

    it('keep standing first whatever order the strip is asked for', () => {
        const api = storeWith('a', 'b');

        api.getState().pinTab('a');
        api.getState().setTabOrder(ROOT_GROUP_ID, ['b', 'a']);

        expect(strips(api)).toEqual([['^a', 'b']]);
    });

    /** A pinned tab carried to another group stays pinned there, and first. */
    it('stay pinned and first when moved to another group', () => {
        const api = storeWith('a', 'b');
        const beside = api.getState().splitGroup(ROOT_GROUP_ID, 'row');

        api.getState().openTab(beside, item('c'));
        api.getState().pinTab('a');
        api.getState().moveTab('a', beside);

        expect(strips(api).at(-1)).toEqual(['^a', 'c']);
    });
});
