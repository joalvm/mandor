import { describe, expect, it } from 'vitest';

import { createWorkspacesStore } from '../src/workspaces-store.js';

const EVENTS = { id: 'events', kind: 'async', name: 'Events', modifiedAt: null } as const;
const ORDERS = { id: 'orders', kind: 'async', name: 'Orders', modifiedAt: null } as const;

describe('the workspaces store', () => {
    it('starts with nothing in it', () => {
        expect(createWorkspacesStore().getState().workspaces).toEqual([]);
    });

    it('replaces the list when a repository is opened', () => {
        const store = createWorkspacesStore();

        store.getState().setWorkspaces([EVENTS]);
        store.getState().setWorkspaces([ORDERS]);

        expect(store.getState().workspaces).toEqual([ORDERS]);
    });

    /** A workspace just created has to appear without asking main for the whole list again. */
    it('appends a workspace it did not know', () => {
        const store = createWorkspacesStore();

        store.getState().setWorkspaces([EVENTS]);
        store.getState().upsertWorkspace(ORDERS);

        expect(store.getState().workspaces).toEqual([EVENTS, ORDERS]);
    });

    it('replaces a workspace it already knew', () => {
        const store = createWorkspacesStore();

        store.getState().setWorkspaces([EVENTS]);
        store.getState().upsertWorkspace({ ...EVENTS, name: 'Renamed' });

        expect(store.getState().workspaces).toEqual([{ ...EVENTS, name: 'Renamed' }]);
    });

    it('empties itself when the repository is closed', () => {
        const store = createWorkspacesStore();

        store.getState().setWorkspaces([EVENTS]);
        store.getState().reset();

        expect(store.getState().workspaces).toEqual([]);
    });
});
