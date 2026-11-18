import { success } from '@mandor/ipc';
import { bridge, shellStore } from '@mandor/shell';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { workspacesStore } from '../src/index.js';
import { openNewWorkspace } from '../src/open-new-workspace.js';

const EVENTS = { id: 'events', kind: 'async', name: 'Events', modifiedAt: null } as const;
const ORDERS = { id: 'orders', kind: 'async', name: 'Orders', modifiedAt: null } as const;

beforeEach(() => {
    vi.restoreAllMocks();
    shellStore.getState().reset();
    workspacesStore.getState().reset();
    workspacesStore.getState().setWorkspaces([EVENTS]);
    shellStore.getState().setActiveWorkspace('events');
    vi.spyOn(bridge.workspace, 'list').mockResolvedValue(success([EVENTS, ORDERS]));
});

describe('opening a workspace an import made', () => {
    it('lists it on the page and makes it the open one', async () => {
        await openNewWorkspace('orders');

        expect(workspacesStore.getState().workspaces).toEqual([EVENTS, ORDERS]);
        expect(shellStore.getState().activeWorkspaceId).toBe('orders');
    });
});
