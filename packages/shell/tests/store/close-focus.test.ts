import { createFakeBridge } from '@mandor/ipc/testing';
import { leavesOf, ROOT_GROUP_ID } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import type { Tab } from '../../src/index.js';
import { createShellStore, type ShellStoreApi } from '../../src/shell-store.js';

function tab(id: string): Tab {
    return { id, kind: 'doc', resource: `mandor://demo/payments/doc/${id}.md` };
}

function store(): ShellStoreApi {
    const api = createShellStore(createFakeBridge());

    api.getState().openTab(ROOT_GROUP_ID, tab('one'));
    api.getState().openTab(ROOT_GROUP_ID, tab('two'));
    api.getState().openTab(ROOT_GROUP_ID, tab('three'));

    return api;
}

function shown(api: ShellStoreApi): string | null {
    return leavesOf(api.getState().grid)[0]?.activeTab ?? null;
}

describe('what the group shows after the tab it was showing closes', () => {
    /** The strip closes leftwards under the pointer, so the tab that slides in is the right one. */
    it('shows the tab to the right of the one that closed', () => {
        const api = store();

        api.getState().setActiveTab(ROOT_GROUP_ID, 'two');
        api.getState().closeTab(ROOT_GROUP_ID, 'two');

        expect(shown(api)).toBe('three');
    });

    it('falls back to the left when the tab that closed was the last one', () => {
        const api = store();

        api.getState().closeTab(ROOT_GROUP_ID, 'three');

        expect(shown(api)).toBe('two');
    });

    it('leaves the shown tab alone when another one closes', () => {
        const api = store();

        api.getState().setActiveTab(ROOT_GROUP_ID, 'one');
        api.getState().closeTab(ROOT_GROUP_ID, 'three');

        expect(shown(api)).toBe('one');
    });

    it('shows nothing once the group has run out of tabs', () => {
        const api = store();

        api.getState().closeTab(ROOT_GROUP_ID, 'one');
        api.getState().closeTab(ROOT_GROUP_ID, 'two');
        api.getState().closeTab(ROOT_GROUP_ID, 'three');

        expect(shown(api)).toBeNull();
    });
});
