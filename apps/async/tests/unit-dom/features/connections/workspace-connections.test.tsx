import { success } from '@mandor/ipc';
import { shellStore } from '@mandor/shell';
import { cleanup, act, render, screen } from '@testing-library/react';
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

    shellStore.getState().reset();
});

describe('the connections the window keeps', () => {
    /**
     * Folding a section unmounts its body. A body that loaded on mount wiped the live states,
     * blanked the panel of every open connection and dialled the restored ones a second time.
     */
    it('keeps the connections and their live state through a fold of the section', async () => {
        render(<WorkspaceConnections reloadWhen={reloadNever} />, { wrapper: AppProviders });

        const unfolded = render(<ConnectionsSidebar />, { wrapper: AppProviders });

        await screen.findByRole('option', { name: 'Echo' });
        act(() => {
            connectionsStore.getState().setConnectionState('echo', 'open');
        });
        unfolded.unmount();
        render(<ConnectionsSidebar />, { wrapper: AppProviders });

        expect(screen.getByRole('option', { name: 'Echo' })).toBeVisible();
        expect(connectionsStore.getState().states['echo']).toBe('open');
        expect(asyncBridge.connection.list).toHaveBeenCalledTimes(1);
    });

    /**
     * An import writes connections behind the list's back. Whoever knows that it happened says
     * so through `reloadWhen`, and the list reads again: the feature never names the import.
     */
    it('reads the connections again when told something wrote them', async () => {
        let reload: () => void = () => undefined;
        const stop = vi.fn();

        const drawn = render(
            <WorkspaceConnections
                reloadWhen={(handler) => {
                    reload = handler;

                    return stop;
                }}
            />,
            { wrapper: AppProviders },
        );

        await vi.waitFor(() => {
            expect(asyncBridge.connection.list).toHaveBeenCalledTimes(1);
        });
        act(() => {
            reload();
        });

        expect(asyncBridge.connection.list).toHaveBeenCalledTimes(2);
        drawn.unmount();
        expect(stop).toHaveBeenCalledTimes(1);
    });
});
