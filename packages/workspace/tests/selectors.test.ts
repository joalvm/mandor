import { describe, expect, it } from 'vitest';

import { selectWorkspaces } from '../src/selectors.js';
import { createWorkspacesStore } from '../src/workspaces-store.js';

const EVENTS = { id: 'events', kind: 'async', name: 'Events', modifiedAt: null } as const;

describe('the workspaces a component reads', () => {
    it('are the ones the store holds', () => {
        const store = createWorkspacesStore();

        store.getState().setWorkspaces([EVENTS]);

        expect(selectWorkspaces(store.getState())).toEqual([EVENTS]);
    });

    /**
     * A selector that answered a new empty array on every read would redraw whoever uses it each
     * time the store moves, so «none» is one array, whichever store says it.
     */
    it('are the same empty list every time there is none', () => {
        const first = createWorkspacesStore();
        const second = createWorkspacesStore();

        expect(selectWorkspaces(first.getState())).toEqual([]);
        expect(selectWorkspaces(first.getState())).toBe(selectWorkspaces(second.getState()));
    });
});
