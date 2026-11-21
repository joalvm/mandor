import { leavesOf, ROOT_GROUP_ID, success } from '@mandor/ipc';
import { selectGroupOfTab, selectTabs, shellStore } from '@mandor/shell';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { asyncBridge } from '../../../../src/renderer/app/async-bridge.js';
import {
    ConnectionsSidebar,
    connectionsStore,
    WorkspaceConnections,
} from '../../../../src/renderer/features/connections/index.js';

import { AppProviders } from '../../support/app-providers.js';
import { fakeConnection } from './support/fake-connections.js';
import { reloadNever } from './support/reload-never.js';

async function renderListed(): Promise<HTMLElement> {
    render(
        <>
            <WorkspaceConnections reloadWhen={reloadNever} />
            <ConnectionsSidebar />
        </>,
        { wrapper: AppProviders },
    );

    return screen.findByRole('option', { name: 'Echo' });
}

beforeEach(() => {
    vi.restoreAllMocks();
    connectionsStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
    vi.spyOn(asyncBridge.connection, 'list').mockResolvedValue(
        success([fakeConnection('echo', 'Echo')]),
    );
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    // The window schedules a session save on every change; nothing here waits 250 ms for it.
    shellStore.getState().reset();
});

describe('opening a connection from the list', () => {
    it('opens it in the group the window is working in', async () => {
        fireEvent.click(await renderListed());

        expect(selectTabs(shellStore.getState())).toEqual([
            {
                id: 'echo',
                kind: 'connection',
                resource: 'mandor://local-apis/events/connection/echo',
            },
        ]);
    });

    /** One connection is one resource: a second tab of it would be the same view twice. */
    it('activates the tab it already has instead of opening a second', async () => {
        const row = await renderListed();

        fireEvent.click(row);

        // The row follows the tab in front, so moving the focus by hand is an update it draws.
        act(() => {
            const beside = shellStore.getState().splitGroup(ROOT_GROUP_ID, 'row');

            shellStore.getState().focusGroup(beside);
        });
        fireEvent.click(row);

        expect(selectTabs(shellStore.getState())).toHaveLength(1);
        expect(shellStore.getState().activeGroupId).toBe(ROOT_GROUP_ID);
        expect(selectGroupOfTab(shellStore.getState(), 'echo')).toBe(ROOT_GROUP_ID);
    });

    it('opens it in the group beside when the row is taken with a modifier', async () => {
        fireEvent.click(await renderListed(), { altKey: true });

        const { grid } = shellStore.getState();

        expect(leavesOf(grid)).toHaveLength(2);
        expect(selectGroupOfTab(shellStore.getState(), 'echo')).not.toBe(ROOT_GROUP_ID);
    });
});
