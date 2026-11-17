import { describe, expect, it } from 'vitest';

import { initialWorkspacesSlice } from '../src/workspaces.slice.js';

const EVENTS = { id: 'events', kind: 'async', name: 'Events', modifiedAt: null } as const;

describe('the workspaces of a window before a repository is opened', () => {
    it('has none', () => {
        expect(initialWorkspacesSlice()).toEqual({ workspaces: [] });
    });

    it('hands out a fresh list every time, so a reset never inherits the last one', () => {
        const first = initialWorkspacesSlice();

        first.workspaces.push(EVENTS);

        expect(initialWorkspacesSlice().workspaces).toEqual([]);
    });
});
