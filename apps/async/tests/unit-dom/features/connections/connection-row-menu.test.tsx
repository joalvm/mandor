import { success } from '@mandor/ipc';
import type { FakeBridge } from '@mandor/ipc/testing';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { asyncBridge } from '../../../../src/renderer/app/async-bridge.js';
import { ConnectionRowMenu } from '../../../../src/renderer/features/connections/components/sidebar/ConnectionRowMenu.js';
import { connectionsStore } from '../../../../src/renderer/features/connections/connections-store.js';

import { AppProviders } from '../../support/app-providers.js';
import { fakeConnection } from './support/fake-connections.js';

const fakeBridge = asyncBridge as FakeBridge;
const ECHO = fakeConnection('echo', 'Echo');
const SCOPE = { workspaceId: 'events' };

/** Row actions live behind a menu, so a test opens it before pressing one. */
function openRowMenu(): void {
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Connection actions' }), {
        button: 0,
        ctrlKey: false,
    });
}

function draw(onRename = vi.fn()): void {
    render(<ConnectionRowMenu connection={ECHO} onRename={onRename} scope={SCOPE} />, {
        wrapper: AppProviders,
    });
}

beforeEach(() => {
    vi.restoreAllMocks();
    connectionsStore.getState().reset();
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    connectionsStore.getState().reset();
});

describe('the menu of one row of the collection', () => {
    /** The row takes the click to select; the menu must never let a command count as one. */
    it('keeps a command on the menu from selecting the row under it', () => {
        const onRowClick = vi.fn();

        render(
            <div onClick={onRowClick}>
                <ConnectionRowMenu connection={ECHO} onRename={vi.fn()} scope={SCOPE} />
            </div>,
            { wrapper: AppProviders },
        );

        fireEvent.click(screen.getByRole('button', { name: 'Connection actions' }));

        expect(onRowClick).not.toHaveBeenCalled();
    });

    it('hands the rename to the row and writes nothing itself', async () => {
        const onRename = vi.fn();
        const update = vi.spyOn(fakeBridge.connection, 'update').mockResolvedValue(success(ECHO));

        draw(onRename);
        openRowMenu();
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Rename' }));

        expect(onRename).toHaveBeenCalledOnce();
        expect(update).not.toHaveBeenCalled();
    });

    /** Deleting is irreversible, so it is named with an ellipsis and asked before it happens. */
    it('asks before deleting, and deletes nothing while the question is open', async () => {
        const remove = vi.spyOn(fakeBridge.connection, 'delete').mockResolvedValue(success({}));

        draw();
        openRowMenu();
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete connection' }));

        expect(await screen.findByRole('alertdialog')).toHaveTextContent('Echo');
        expect(remove).not.toHaveBeenCalled();
    });

    it('keeps the connection when the question is answered no', async () => {
        const remove = vi.spyOn(fakeBridge.connection, 'delete').mockResolvedValue(success({}));

        draw();
        openRowMenu();
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete connection' }));

        expect(await screen.findByRole('alertdialog')).toBeVisible();

        fireEvent.click(screen.getByRole('button', { name: 'Keep' }));

        await waitFor(() => {
            expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
        });
        expect(remove).not.toHaveBeenCalled();
        expect(connectionsStore.getState().connections).toHaveLength(0);
    });

    it('deletes through the asyncBridge when the question is answered yes', async () => {
        const remove = vi.spyOn(fakeBridge.connection, 'delete').mockResolvedValue(success({}));

        draw();
        openRowMenu();
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete connection' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));

        await waitFor(() => {
            expect(remove).toHaveBeenCalledWith({ connectionId: 'echo', workspaceId: 'events' });
        });
    });

    /** The switch speaks the state of the socket: down offers up, up offers down. */
    it('offers to connect a connection that is down', async () => {
        draw();
        openRowMenu();

        expect(await screen.findByRole('menuitem', { name: 'Connect' })).toBeVisible();
        expect(screen.queryByRole('menuitem', { name: 'Disconnect' })).toBeNull();
    });

    it('offers to disconnect a connection that is up', async () => {
        draw();
        act(() => {
            connectionsStore.getState().setConnectionState('echo', 'open');
        });
        openRowMenu();

        expect(await screen.findByRole('menuitem', { name: 'Disconnect' })).toBeVisible();
        expect(screen.queryByRole('menuitem', { name: 'Connect' })).toBeNull();
    });

    it('opens the settings dialog of the connection it names', async () => {
        draw();
        openRowMenu();
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Settings' }));

        expect(await screen.findByRole('dialog')).toBeVisible();
        expect(screen.getByRole('listbox', { name: 'Connection sections' })).toBeVisible();
    });
});
