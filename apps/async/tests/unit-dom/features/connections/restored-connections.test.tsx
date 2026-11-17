import { MessagesProvider } from '@mandor/i18n';
import { ROOT_GROUP_ID, success } from '@mandor/ipc';
import { shellStore } from '@mandor/shell';
import { ToastProvider, TooltipProvider } from '@mandor/ui';
import type { Connection } from '@mandor/schema';
import { render, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { asyncBridge } from '../../../../src/renderer/app/async-bridge.js';
import {
    connectionsStore,
    WorkspaceConnections,
} from '../../../../src/renderer/features/connections/index.js';

import { reloadNever } from './support/reload-never.js';

const WORKSPACE_ID = 'events';

function connection(id: string, autoConnect?: boolean): Connection {
    return {
        id,
        name: id,
        transport: 'websocket',
        url: `wss://example.test/${id}`,
        headers: [],
        environmentId: null,
        ...(autoConnect === undefined ? {} : { autoConnect }),
    };
}

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>
                <ToastProvider
                    messages={{ close: 'Close', more: (count) => `${String(count)} more` }}
                >
                    {children}
                </ToastProvider>
            </TooltipProvider>
        </MessagesProvider>
    );
}

/** The window comes back showing both connections, which is all the session remembers. */
function restoreTabs(): void {
    for (const id of ['alpha', 'beta']) {
        shellStore.getState().openTab(ROOT_GROUP_ID, {
            id,
            kind: 'connection',
            resource: `mandor://local-apis/events/connection/${id}`,
        });
    }
}

beforeEach(() => {
    vi.restoreAllMocks();
    connectionsStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: WORKSPACE_ID });
});

describe('the connections a restored window comes back with', () => {
    it('dials the one whose file asks for it, and leaves the rest closed', async () => {
        vi.spyOn(asyncBridge.connection, 'list').mockResolvedValue(
            success([connection('alpha', true), connection('beta')]),
        );

        const open = vi.spyOn(asyncBridge.ws, 'open');

        restoreTabs();
        render(<WorkspaceConnections reloadWhen={reloadNever} />, { wrapper: Wrapper });

        await waitFor(() => {
            expect(open).toHaveBeenCalledWith({
                connectionId: 'alpha',
                environmentId: null,
                transport: 'websocket',
                maximumMessageSizeBytes: 104_857_600,
                handshakeTimeoutMs: 20_000,
                reconnect: { baseMs: 500, ceilingMs: 8_000, maxAttempts: 5, spread: 0.2 },
                verifyCertificate: true,
                template: { headers: {}, url: 'wss://example.test/alpha' },
                workspaceId: WORKSPACE_ID,
            });
        });
        expect(open).toHaveBeenCalledTimes(1);
    });

    /**
     * The grid and the connections land in the window by different doors, and either may
     * arrive first: a list that resolved before the session did still gets dialled once the
     * tab shows up.
     */
    it('dials a connection whose tab the window shows only after its list arrived', async () => {
        vi.spyOn(asyncBridge.connection, 'list').mockResolvedValue(
            success([connection('alpha', true)]),
        );

        const open = vi.spyOn(asyncBridge.ws, 'open');

        render(<WorkspaceConnections reloadWhen={reloadNever} />, { wrapper: Wrapper });

        await waitFor(() => {
            expect(connectionsStore.getState().connections).toHaveLength(1);
        });

        expect(open).not.toHaveBeenCalled();

        restoreTabs();

        await waitFor(() => {
            expect(open).toHaveBeenCalledWith({
                connectionId: 'alpha',
                environmentId: null,
                transport: 'websocket',
                maximumMessageSizeBytes: 104_857_600,
                handshakeTimeoutMs: 20_000,
                reconnect: { baseMs: 500, ceilingMs: 8_000, maxAttempts: 5, spread: 0.2 },
                verifyCertificate: true,
                template: { headers: {}, url: 'wss://example.test/alpha' },
                workspaceId: WORKSPACE_ID,
            });
        });
        expect(open).toHaveBeenCalledTimes(1);
    });

    /** A tab that is not on screen is not a window to come back to, so nothing is dialled. */
    it('opens nothing for a connection the session never had a tab for', async () => {
        vi.spyOn(asyncBridge.connection, 'list').mockResolvedValue(
            success([connection('gamma', true)]),
        );

        const open = vi.spyOn(asyncBridge.ws, 'open');

        restoreTabs();
        render(<WorkspaceConnections reloadWhen={reloadNever} />, { wrapper: Wrapper });

        await waitFor(() => {
            expect(connectionsStore.getState().connections).toHaveLength(1);
        });
        expect(open).not.toHaveBeenCalled();
    });
});
