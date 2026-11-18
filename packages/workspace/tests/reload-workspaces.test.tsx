import { MessagesProvider } from '@mandor/i18n';
import { success, type ListedWorkspace } from '@mandor/ipc';
import type { FakeBridge } from '@mandor/ipc/testing';
import { bridge, shellStore } from '@mandor/shell';
import { cleanup, render, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { reloadWorkspaces } from '../src/reload-workspaces.js';
import { WorkspaceMenu, workspacesStore } from '../src/index.js';

const EVENTS = { id: 'events', kind: 'async', name: 'Events', modifiedAt: null } as const;
const ORDERS = { id: 'orders', kind: 'async', name: 'Orders', modifiedAt: null } as const;

function Wrapper({ children }: { children: ReactNode }) {
    return <MessagesProvider preferences={{ language: 'en' }}>{children}</MessagesProvider>;
}

beforeEach(() => {
    vi.restoreAllMocks();
    shellStore.getState().reset();
    workspacesStore.getState().reset();
    workspacesStore.getState().setWorkspaces([EVENTS]);
    shellStore.getState().setActiveWorkspace('events');
    vi.spyOn(bridge.workspace, 'list').mockResolvedValue(success([EVENTS, ORDERS]));
});

afterEach(() => {
    cleanup();
});

describe('reading the workspaces again because the repository changed on disk', () => {
    it('shows the workspaces the disk has and keeps the one that is open', async () => {
        await reloadWorkspaces();

        expect(workspacesStore.getState().workspaces).toEqual([EVENTS, ORDERS]);
        expect(shellStore.getState().activeWorkspaceId).toBe('events');
    });

    it('moves to the first workspace that is left when the open one went away', async () => {
        vi.mocked(bridge.workspace.list).mockResolvedValue(success([ORDERS]));

        await reloadWorkspaces();

        expect(shellStore.getState().activeWorkspaceId).toBe('orders');
    });

    it('keeps the list it has when the disk cannot be read', async () => {
        vi.mocked(bridge.workspace.list).mockResolvedValue({
            ok: false,
            error: { code: 'unknown', message: 'no' },
        });

        await reloadWorkspaces();

        expect(workspacesStore.getState().workspaces).toEqual([EVENTS]);
    });

    it('keeps the list read last, whichever answer comes back last', async () => {
        const answers: ((workspaces: ListedWorkspace[]) => void)[] = [];

        vi.mocked(bridge.workspace.list).mockImplementation(
            () =>
                new Promise((resolve) => {
                    answers.push((workspaces) => {
                        resolve(success(workspaces));
                    });
                }),
        );

        const before = reloadWorkspaces();
        const after = reloadWorkspaces();

        answers[1]?.([EVENTS, ORDERS]);
        await after;
        answers[0]?.([EVENTS]);
        await before;

        expect(workspacesStore.getState().workspaces).toEqual([EVENTS, ORDERS]);
    });
});

describe('the workspace menu when the repository changes under it', () => {
    it('reads the list again for a workspace or the repo itself', async () => {
        render(<WorkspaceMenu onManage={vi.fn()} />, { wrapper: Wrapper });

        (bridge as FakeBridge).emitRepoChanged({
            changes: [{ area: 'workspace', workspaceId: 'orders' }],
        });

        await waitFor(() => {
            expect(workspacesStore.getState().workspaces).toEqual([EVENTS, ORDERS]);
        });
        expect(bridge.workspace.list).toHaveBeenCalledTimes(1);
    });

    it('leaves the list alone for the contents of a workspace', () => {
        render(<WorkspaceMenu onManage={vi.fn()} />, { wrapper: Wrapper });

        (bridge as FakeBridge).emitRepoChanged({
            changes: [{ area: 'doc', workspaceId: 'events', name: 'a.md' }],
        });

        expect(bridge.workspace.list).not.toHaveBeenCalled();
    });
});
