import { ROOT_GROUP_ID, success } from '@mandor/ipc';
import { shellStore } from '@mandor/shell';
import { TabOf } from '@mandor/shell/testing/tab-strip';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { asyncBridge } from '../../../../src/renderer/app/async-bridge.js';
import {
    ConnectionsSidebar,
    connectionsStore,
    ConnectionTabKind,
    WorkspaceConnections,
} from '../../../../src/renderer/features/connections/index.js';

import { AppProviders } from '../../support/app-providers.js';
import { fakeConnection } from './support/fake-connections.js';
import { reloadNever } from './support/reload-never.js';

const RESOURCE = 'mandor://local-apis/events/connection/echo';

let unregister: () => void;

async function renderRow(): Promise<void> {
    render(
        <>
            <TabOf tab={{ id: 'echo', kind: 'connection', resource: RESOURCE }} />
            <WorkspaceConnections reloadWhen={reloadNever} />
            <ConnectionsSidebar />
        </>,
        { wrapper: AppProviders },
    );

    await screen.findByRole('option', { name: 'Echo' });
}

/** Row actions live behind a menu, so a test opens it before pressing one. */
function openRowMenu(): void {
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Connection actions' }), {
        button: 0,
        ctrlKey: false,
    });
}

beforeEach(() => {
    vi.restoreAllMocks();
    connectionsStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
    shellStore
        .getState()
        .openTab(ROOT_GROUP_ID, { id: 'echo', kind: 'connection', resource: RESOURCE });
    vi.spyOn(asyncBridge.connection, 'list').mockResolvedValue(
        success([fakeConnection('echo', 'Echo')]),
    );
    unregister = render(<ConnectionTabKind />, { wrapper: AppProviders }).unmount;
});

afterEach(() => {
    cleanup();
    unregister();
    // The window schedules a session save on every change; nothing here waits 250 ms for it.
    shellStore.getState().reset();
});

describe('one row of the connections section', () => {
    /** The collection owns the name, so a rename in the list is a rename everywhere it is shown. */
    it('renames in place and retitles the tab that was already open', async () => {
        const update = vi.spyOn(asyncBridge.connection, 'update');

        await renderRow();
        openRowMenu();
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Rename' }));

        const field = screen.getByRole('textbox', { name: 'Connection name' });

        field.textContent = 'Echo bis';
        fireEvent.input(field);
        fireEvent.keyDown(field, { key: 'Enter' });

        expect(screen.getByRole('tab', { name: 'Echo bis' })).toBeVisible();
        await waitFor(() => {
            expect(update).toHaveBeenCalledWith({
                changes: { name: 'Echo bis' },
                connectionId: 'echo',
                workspaceId: 'events',
            });
        });
    });

    /** Deleting is irreversible, so it is named with an ellipsis and asked before it happens. */
    it('asks before deleting, and deletes nothing while the question is open', async () => {
        const remove = vi.spyOn(asyncBridge.connection, 'delete');

        await renderRow();
        openRowMenu();
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete connection' }));

        expect(await screen.findByRole('alertdialog')).toHaveTextContent('Echo');
        expect(remove).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

        await waitFor(() => {
            expect(remove).toHaveBeenCalledWith({
                connectionId: 'echo',
                workspaceId: 'events',
            });
        });
        expect(screen.queryByRole('option', { name: 'Echo' })).toBeNull();
    });
});

describe('a connection a tab asks the lateral to show', () => {
    it('hands its row the focus, then says it is shown', async () => {
        await renderRow();

        act(() => {
            shellStore.getState().setRevealing(RESOURCE);
        });

        expect(screen.getByRole('option', { name: 'Echo' })).toHaveFocus();
        expect(shellStore.getState().revealing).toBeNull();
    });
});
