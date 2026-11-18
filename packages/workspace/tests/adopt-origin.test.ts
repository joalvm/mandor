import { EMPTY_UI_SESSION, success, type ListedWorkspace, type UiSession } from '@mandor/ipc';
import { shellStore } from '@mandor/shell';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { activateWorkspace, adoptOrigin } from '../src/adopt-origin.js';
import { workspacesStore } from '../src/workspaces-store.js';

const EVENTS: ListedWorkspace = { id: 'events', kind: 'async', name: 'Events', modifiedAt: null };
const ORDERS: ListedWorkspace = { id: 'orders', kind: 'async', name: 'Orders', modifiedAt: null };

/** The origin the window opens onto, with the session it saved the last time it was open. */
function sessionOn(activeWorkspaceId: string | null): UiSession {
    return { ...EMPTY_UI_SESSION, activeWorkspaceId };
}

beforeEach(() => {
    vi.restoreAllMocks();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local' });
    workspacesStore.getState().reset();
});

afterEach(() => {
    workspacesStore.getState().reset();
    shellStore.getState().reset();
});

describe('taking an origin that was just opened', () => {
    it('keeps the workspaces it brought', async () => {
        vi.spyOn(window.mandor.session, 'load').mockResolvedValue(success(sessionOn(null)));

        await adoptOrigin('local', { repo: null, workspaces: [EVENTS, ORDERS] });

        expect(workspacesStore.getState().workspaces).toEqual([EVENTS, ORDERS]);
    });

    it('goes back to the workspace the session was left on', async () => {
        vi.spyOn(window.mandor.session, 'load').mockResolvedValue(success(sessionOn('orders')));

        await adoptOrigin('local', { repo: null, workspaces: [EVENTS, ORDERS] });

        expect(shellStore.getState().activeWorkspaceId).toBe('orders');
    });

    it('falls to the first workspace when the session left on one that is gone', async () => {
        vi.spyOn(window.mandor.session, 'load').mockResolvedValue(success(sessionOn('deleted')));

        await adoptOrigin('local', { repo: null, workspaces: [EVENTS, ORDERS] });

        expect(shellStore.getState().activeWorkspaceId).toBe('events');
    });

    it('opens no tab: the window shows what was left open, and nothing else', async () => {
        vi.spyOn(window.mandor.session, 'load').mockResolvedValue(success(sessionOn(null)));

        await adoptOrigin('local', { repo: null, workspaces: [EVENTS] });

        expect(shellStore.getState().activeOriginId).toBe('local');
        expect(shellStore.getState().resources).toEqual({});
    });
});

describe('the workspace a window works in once its session is back', () => {
    it('is the one the session named when that one is still on disk', () => {
        shellStore.setState({ activeWorkspaceId: 'orders' });

        activateWorkspace([EVENTS, ORDERS]);

        expect(shellStore.getState().activeWorkspaceId).toBe('orders');
    });

    it('is the first one when the session named none', () => {
        shellStore.setState({ activeWorkspaceId: null });

        activateWorkspace([EVENTS, ORDERS]);

        expect(shellStore.getState().activeWorkspaceId).toBe('events');
    });

    it('stays as it was when the origin has no workspace to offer', () => {
        shellStore.setState({ activeWorkspaceId: 'deleted' });

        activateWorkspace([]);

        expect(shellStore.getState().activeWorkspaceId).toBe('deleted');
    });
});
