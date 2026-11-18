import { ROOT_GROUP_ID, success } from '@mandor/ipc';
import type { FakeBridge } from '@mandor/ipc/testing';
import { selectTabs, shellStore } from '@mandor/shell';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { asyncBridge } from '../../../../src/renderer/app/async-bridge.js';
import { ConnectionRow } from '../../../../src/renderer/features/connections/components/sidebar/ConnectionRow.js';
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

function draw(connection = ECHO): { rerender: (connection: typeof ECHO) => void } {
    const view = render(<ConnectionRow connection={connection} scope={SCOPE} selected={false} />, {
        wrapper: AppProviders,
    });

    return {
        rerender: (next: typeof ECHO) => {
            view.rerender(<ConnectionRow connection={next} scope={SCOPE} selected={false} />);
        },
    };
}

beforeEach(() => {
    vi.restoreAllMocks();
    connectionsStore.getState().reset();
    connectionsStore.getState().upsertConnection(ECHO);
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    // The window schedules a session save on every change; nothing here waits 250 ms for it.
    shellStore.getState().reset();
});

describe('one entry of the collection', () => {
    it('shows the connection where it stands, live state and actions beside the name', () => {
        draw();

        expect(screen.getByRole('option', { name: 'Echo' })).toBeVisible();
        expect(screen.getByRole('img', { name: 'Disconnected' })).toBeVisible();
        expect(screen.getByRole('button', { name: 'Connection actions' })).toBeVisible();
    });

    it('opens the connection in the active group when the row is taken', () => {
        draw();

        fireEvent.click(screen.getByRole('option', { name: 'Echo' }));

        expect(connectionsStore.getState().activeConnectionId).toBe('echo');
        expect(selectTabs(shellStore.getState())).toEqual([
            {
                id: 'echo',
                kind: 'connection',
                resource: 'mandor://local-apis/events/connection/echo',
            },
        ]);
        expect(shellStore.getState().activeGroupId).toBe(ROOT_GROUP_ID);
    });

    it('renames in place and persists the name under the workspace of the row', async () => {
        const update = vi.spyOn(fakeBridge.connection, 'update').mockResolvedValue(success(ECHO));

        const { rerender } = draw();

        openRowMenu();
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Rename' }));

        const field = screen.getByRole('textbox', { name: 'Connection name' });

        field.textContent = 'Echo bis';
        fireEvent.input(field);
        fireEvent.keyDown(field, { key: 'Enter' });

        expect(connectionsStore.getState().connections[0]?.name).toBe('Echo bis');
        await waitFor(() => {
            expect(update).toHaveBeenCalledWith({
                changes: { name: 'Echo bis' },
                connectionId: 'echo',
                workspaceId: 'events',
            });
        });
        // The section reads the collection: what the store holds is what the row draws.
        rerender({ ...ECHO, name: 'Echo bis' });
        expect(screen.getByRole('option', { name: 'Echo bis' })).toBeVisible();
    });

    /** An empty name is no name: the row keeps the field open instead of going blank. */
    it('keeps the edition open when the name comes out empty', async () => {
        const update = vi.spyOn(fakeBridge.connection, 'update').mockResolvedValue(success(ECHO));

        draw();
        openRowMenu();
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Rename' }));

        const field = screen.getByRole('textbox', { name: 'Connection name' });

        field.textContent = '   ';
        fireEvent.input(field);
        fireEvent.keyDown(field, { key: 'Enter' });

        expect(connectionsStore.getState().connections[0]?.name).toBe('Echo');
        expect(update).not.toHaveBeenCalled();
        expect(screen.getByRole('textbox', { name: 'Connection name' })).toBeVisible();
    });

    it('puts the row back as it was when the edition is cancelled', async () => {
        const update = vi.spyOn(fakeBridge.connection, 'update').mockResolvedValue(success(ECHO));

        draw();
        openRowMenu();
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Rename' }));

        const field = screen.getByRole('textbox', { name: 'Connection name' });

        field.textContent = 'Echo bis';
        fireEvent.input(field);
        fireEvent.keyDown(field, { key: 'Escape' });

        expect(screen.getByRole('option', { name: 'Echo' })).toBeVisible();
        expect(update).not.toHaveBeenCalled();
    });

    /** The field stands where the name stood: the state and the actions stay beside it. */
    it('renames in the place of the name, with the state and the actions still in the row', async () => {
        draw();
        openRowMenu();
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Rename' }));

        const row = screen.getByRole('option');

        expect(within(row).getByRole('textbox', { name: 'Connection name' })).toBeVisible();
        expect(within(row).getByRole('img', { name: 'Disconnected' })).toBeVisible();
        expect(within(row).getByRole('button', { name: 'Connection actions' })).toBeVisible();
    });

    it('opens nothing while the name is being typed', async () => {
        draw();
        openRowMenu();
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Rename' }));

        const field = screen.getByRole('textbox', { name: 'Connection name' });

        fireEvent.click(field);
        fireEvent.keyDown(field, { key: ' ' });

        expect(connectionsStore.getState().activeConnectionId).toBeNull();
    });
});
