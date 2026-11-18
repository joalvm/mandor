import { success } from '@mandor/ipc';
import { shellStore, Sidebar } from '@mandor/shell';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { asyncBridge } from '../../../../src/renderer/app/async-bridge.js';
import { ConnectionsSection } from '../../../../src/renderer/features/connections/components/sidebar/ConnectionsSection.js';
import { connectionsStore } from '../../../../src/renderer/features/connections/index.js';

import { AppProviders } from '../../support/app-providers.js';
import { fakeConnection } from './support/fake-connections.js';

beforeEach(() => {
    connectionsStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();
    vi.restoreAllMocks();
    connectionsStore.getState().reset();
    shellStore.getState().reset();
});

describe('the add action in the header of the connections', () => {
    it('opens a folded section and makes a connection under its word, its row left as it is', async () => {
        const create = vi
            .spyOn(asyncBridge.connection, 'create')
            .mockResolvedValue(success(fakeConnection('fresh', 'New connection')));

        shellStore.getState().setPanels({ collapsedSections: ['connections'] });
        render(
            <>
                <ConnectionsSection order={30} />
                <Sidebar />
            </>,
            { wrapper: AppProviders },
        );
        fireEvent.click(screen.getByRole('button', { name: 'New connection' }));

        await waitFor(() => {
            expect(create).toHaveBeenCalledWith(
                expect.objectContaining({ name: 'New connection', workspaceId: 'events' }),
            );
        });
        expect(screen.queryByRole('textbox', { name: 'Connection name' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Connections' })).toHaveAttribute(
            'aria-expanded',
            'true',
        );
    });
});
