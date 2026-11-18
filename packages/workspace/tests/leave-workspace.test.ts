import { leavesOf } from '@mandor/ipc';
import { formatResourceUri } from '@mandor/schema';
import { shellStore } from '@mandor/shell';
import { beforeEach, describe, expect, it } from 'vitest';

import { leaveWorkspace } from '../src/leave-workspace.js';

const ORDERS = { id: 'orders', kind: 'async', name: 'Orders', modifiedAt: null } as const;

function itemIn(workspace: string, path: string): string {
    return formatResourceUri({ scope: 'workspace', repo: 'local', workspace, kind: 'item', path });
}

function open(id: string, resource: string): void {
    const state = shellStore.getState();

    state.openTab(state.activeGroupId, { id, kind: 'item', resource });
}

function openIds(): string[] {
    return leavesOf(shellStore.getState().grid).flatMap((leaf) => leaf.tabs.map((tab) => tab.id));
}

beforeEach(() => {
    shellStore.getState().reset();
    shellStore.getState().setActiveWorkspace('events');
});

describe('leaving a workspace that is gone from disk', () => {
    it('moves the window to the next that is left', () => {
        leaveWorkspace('events', [ORDERS]);

        expect(shellStore.getState().activeWorkspaceId).toBe('orders');
    });

    it('moves to none when it was the last', () => {
        leaveWorkspace('events', []);

        expect(shellStore.getState().activeWorkspaceId).toBeNull();
    });

    it('stays where it is when another one is gone', () => {
        leaveWorkspace('orders', []);

        expect(shellStore.getState().activeWorkspaceId).toBe('events');
    });

    it('closes the tabs of that workspace and no other', () => {
        const page = formatResourceUri({ scope: 'app', name: 'workspaces' });

        open('gone', itemIn('events', 'a.yaml'));
        open('other', itemIn('orders', 'b.yaml'));
        open('page', page);

        leaveWorkspace('events', [ORDERS]);

        expect(openIds()).toEqual(['other', 'page']);
    });

    it('leaves nothing of it to reopen', () => {
        const state = shellStore.getState();

        open('gone', itemIn('events', 'a.yaml'));
        open('other', itemIn('orders', 'b.yaml'));
        state.closeTab(state.activeGroupId, 'other');

        const kept = shellStore.getState().closedTabs.map(({ tab }) => tab.id);

        open('earlier', itemIn('events', 'c.yaml'));
        state.closeTab(state.activeGroupId, 'earlier');
        leaveWorkspace('events', [ORDERS]);

        expect(shellStore.getState().closedTabs.map(({ tab }) => tab.id)).toEqual(kept);
    });
});
