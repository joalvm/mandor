import { success } from '@mandor/ipc';
import { shellStore } from '@mandor/shell';
import { rowNames } from '@mandor/ui/testing';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { asyncBridge } from '../../../../src/renderer/app/async-bridge.js';
import {
    ConnectionsSidebar,
    connectionsStore,
    WorkspaceConnections,
} from '../../../../src/renderer/features/connections/index.js';

import { AppProviders } from '../../support/app-providers.js';
import { fakeConnection } from './support/fake-connections.js';
import { reloadNever } from './support/reload-never.js';

function renderSidebar(): void {
    render(
        <>
            <WorkspaceConnections reloadWhen={reloadNever} />
            <ConnectionsSidebar />
        </>,
        { wrapper: AppProviders },
    );
}

beforeEach(() => {
    vi.restoreAllMocks();
    connectionsStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
});

describe('the connections section of the sidebar', () => {
    /** The header holds the way to add one, so an empty body has nothing to say. */
    it('draws nothing while the workspace has no connection', () => {
        renderSidebar();

        expect(screen.queryByRole('listbox')).toBeNull();
    });

    /** The section takes its workspace from the window: nobody hands it a scope any more. */
    it('lists the connections of the workspace the window has open', async () => {
        vi.spyOn(asyncBridge.connection, 'list').mockResolvedValue(
            success([fakeConnection('echo', 'Echo'), fakeConnection('gateway', 'Gateway')]),
        );
        renderSidebar();

        await waitFor(() => {
            expect(rowNames()).toEqual(['Echo', 'Gateway']);
        });
        expect(asyncBridge.connection.list).toHaveBeenCalledWith({ workspaceId: 'events' });
    });

    it('paints the live state of every connection it lists', async () => {
        vi.spyOn(asyncBridge.connection, 'list').mockResolvedValue(
            success([fakeConnection('echo', 'Echo')]),
        );
        renderSidebar();

        expect(await screen.findByRole('img', { name: 'Disconnected' })).toBeVisible();
    });

    /** Creating moved to the header of the section, so the body holds no form of its own. */
    it('holds no form and nothing about the workspace', () => {
        renderSidebar();

        expect(screen.queryByRole('button', { name: 'New connection' })).toBeNull();
        expect(screen.queryByRole('textbox', { name: 'Workspace name' })).toBeNull();
    });
});
