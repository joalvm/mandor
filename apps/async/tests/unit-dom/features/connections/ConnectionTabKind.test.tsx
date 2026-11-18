import { MessagesProvider } from '@mandor/i18n';
import { ROOT_GROUP_ID } from '@mandor/ipc';
import { GroupGrid, shellStore, tabKind } from '@mandor/shell';
import { TabOf } from '@mandor/shell/testing/tab-strip';
import { ToastProvider, TooltipProvider } from '@mandor/ui';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { activityStore } from '../../../../src/renderer/activity/activity-store.js';
import { selectActivityFor } from '../../../../src/renderer/activity/select-activity-for.js';
import {
    connectionsStore,
    ConnectionTabKind,
} from '../../../../src/renderer/features/connections/index.js';
import { asyncBridge } from '../../../../src/renderer/app/async-bridge.js';
import { messageEntry } from '../../../../src/renderer/features/connections/lib/connection-message-entry.js';

const UNREGISTER: (() => void)[] = [];
const RESOURCE = 'mandor://demo/payments/connection/alpha';
const TAB = { id: 'alpha', kind: 'connection', resource: RESOURCE };

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'es' }}>
            <ToastProvider messages={{ close: 'Cerrar', more: (count) => `${String(count)} más` }}>
                <TooltipProvider>{children}</TooltipProvider>
            </ToastProvider>
        </MessagesProvider>
    );
}

function seedConnection(): void {
    connectionsStore.getState().upsertConnection({
        id: 'alpha',
        name: 'Gateway',
        transport: 'websocket',
        url: 'wss://example.test/socket',
        headers: [{ key: 'Authorization', value: 'Bearer token', enabled: true }],
        environmentId: null,
    });
}

function renderStrip(): void {
    render(
        <TabOf
            onClose={(groupId, tabId) => {
                shellStore.getState().closeTab(groupId, tabId);
            }}
            tab={TAB}
        />,
        { wrapper: Wrapper },
    );
}

function openTab(): void {
    shellStore.getState().openTab(ROOT_GROUP_ID, TAB);
}

beforeEach(() => {
    activityStore.getState().reset();
    connectionsStore.getState().reset();
    seedConnection();
    UNREGISTER.push(render(<ConnectionTabKind />, { wrapper: Wrapper }).unmount);
    renderStrip();
});

afterEach(() => {
    cleanup();
    // The spies sit on the one fake bridge the window carries; a live one would keep counting.
    vi.restoreAllMocks();

    for (const unregister of UNREGISTER.splice(0)) {
        unregister();
    }

    // The window schedules a session save on every change; nothing here waits 250 ms for it.
    shellStore.getState().reset();
});

describe('the registered connection tab', () => {
    /** A connection writes itself as it is edited; only an event edited in its composer waits. */
    it('shows itself in the section of the connections, unsaved only by an edited event', () => {
        expect(tabKind('connection')?.section).toBe('connections');
        expect(tabKind('connection')?.dirty?.('alpha', RESOURCE)).toBe(false);
        expect(tabKind('connection')?.save).toBeTypeOf('function');
    });

    /** The configuration lives in the collection now, so the tab closes like any other view. */
    it('offers a close control and no options menu', () => {
        const tab = screen.getByRole('tab', { name: 'Gateway' });

        expect(within(tab).getByRole('button', { name: 'Cerrar pestaña' })).toBeVisible();
        expect(within(tab).queryByRole('button', { name: 'Opciones de conexión' })).toBeNull();
    });

    it('moves the status dot as main pushes connection states', () => {
        const tab = screen.getByRole('tab', { name: 'Gateway' });

        expect(within(tab).getByRole('img', { name: 'Desconectada' })).toHaveAttribute(
            'data-state',
            'disconnected',
        );

        act(() => {
            connectionsStore.getState().setConnectionState('alpha', 'open');
        });

        expect(within(tab).getByRole('img', { name: 'Conectada' })).toHaveAttribute(
            'data-state',
            'connected',
        );

        act(() => {
            connectionsStore.getState().setConnectionState('alpha', 'error');
        });

        expect(within(tab).getByRole('img', { name: 'Error' })).toHaveAttribute(
            'data-state',
            'error',
        );
    });
});

describe('what the connection app declares for the whole window', () => {
    it('says what a group with no tab in it shows', () => {
        render(<GroupGrid />, { wrapper: Wrapper });

        expect(screen.getByText('Seleccione o cree una conexión')).toBeVisible();
    });
});

describe('closing the tab of a live connection', () => {
    beforeEach(() => {
        openTab();

        act(() => {
            connectionsStore.getState().setConnectionState('alpha', 'open');
            activityStore
                .getState()
                .appendActivity(RESOURCE, [messageEntry({ at: 1, data: 'hola', direction: 'in' })]);
        });
    });

    it('closes the socket and frees the buffer of what came through it', () => {
        const close = vi.spyOn(asyncBridge.ws, 'close');

        fireEvent.click(screen.getByRole('button', { name: 'Cerrar pestaña' }));

        expect(close).toHaveBeenCalledWith({ connectionId: 'alpha' });
        expect(selectActivityFor(RESOURCE)(activityStore.getState())).toEqual([]);
    });

    /** Closing a view is not deleting what it was a view of: the configuration stays put. */
    it('leaves the connection in the collection with its configuration intact', () => {
        fireEvent.click(screen.getByRole('button', { name: 'Cerrar pestaña' }));

        expect(connectionsStore.getState().connections).toEqual([
            {
                id: 'alpha',
                name: 'Gateway',
                transport: 'websocket',
                url: 'wss://example.test/socket',
                headers: [{ key: 'Authorization', value: 'Bearer token', enabled: true }],
                environmentId: null,
            },
        ]);
    });

    /** Main may hold a socket the window no longer sees live: a retry waiting out its backoff. */
    it('asks main to close even when the connection was not live', () => {
        const close = vi.spyOn(asyncBridge.ws, 'close');

        act(() => {
            connectionsStore.getState().setConnectionState('alpha', 'closed');
        });
        fireEvent.click(screen.getByRole('button', { name: 'Cerrar pestaña' }));

        expect(close).toHaveBeenCalledWith({ connectionId: 'alpha' });
    });
});
