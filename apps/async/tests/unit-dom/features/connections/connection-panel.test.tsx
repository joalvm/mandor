import { envStore } from '@mandor/env';
import { MessagesProvider } from '@mandor/i18n';
import { ROOT_GROUP_ID } from '@mandor/ipc';
import type { FakeBridge } from '@mandor/ipc/testing';
import { shellStore } from '@mandor/shell';
import { ToastProvider, TooltipProvider } from '@mandor/ui';
import { byPart } from '@mandor/ui/testing';
import { editorAt } from '@mandor/ui/testing/editors-in';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { activityStore } from '../../../../src/renderer/activity/activity-store.js';
import { asyncBridge } from '../../../../src/renderer/app/async-bridge.js';
import {
    connectionsStore,
    ConnectionTabKind,
} from '../../../../src/renderer/features/connections/index.js';
import { ConnectionPanel } from '../../../../src/renderer/features/connections/components/panel/ConnectionPanel.js';

const fakeBridge = asyncBridge as FakeBridge;
const UNREGISTER: (() => void)[] = [];
const RESOURCE = 'mandor://demo/payments/connection/alpha';

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>
                <ToastProvider messages={{ close: 'Cerrar', more: () => 'Más' }}>
                    {children}
                </ToastProvider>
            </TooltipProvider>
        </MessagesProvider>
    );
}

import { composerEventsStore } from '../../../../src/renderer/events/composer-events-store.js';
import { openComposerEvent } from './support/open-composer-event.js';

beforeEach(() => {
    composerEventsStore.getState().reset();
    openComposerEvent('alpha');
    activityStore.getState().reset();
    connectionsStore.getState().reset();
    envStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'payments' });
    // What main pushes lands on the resource the window has open, so the window has it open.
    shellStore.getState().openTab(ROOT_GROUP_ID, {
        id: 'alpha',
        kind: 'connection',
        resource: RESOURCE,
    });
    connectionsStore.getState().upsertConnection({
        id: 'alpha',
        name: 'Gateway',
        transport: 'websocket',
        url: 'wss://example.test/socket',
        headers: [
            { key: 'Authorization', value: 'Bearer token', enabled: true },
            { key: 'X-Debug', value: '1', enabled: false },
        ],
        environmentId: null,
    });
    UNREGISTER.push(render(<ConnectionTabKind />, { wrapper: Wrapper }).unmount);

    render(<ConnectionPanel connectionId="alpha" resource={RESOURCE} />, {
        wrapper: Wrapper,
    });
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted panel is an update outside act.
    cleanup();
    vi.restoreAllMocks();
    shellStore.getState().reset();

    for (const unregister of UNREGISTER.splice(0)) {
        unregister();
    }
});

describe('the connection panel', () => {
    /**
     * The connection rests on a card above the pair, and the message and the activity each on
     * theirs: three cards, each a zone a screen reader can land on.
     */
    it('draws the connection, the message and the activity on three named cards', () => {
        const target = screen.getByRole('region', { name: 'URL de la conexión' });

        expect(target).toContainElement(
            screen.getByRole('textbox', { name: 'URL de la conexión' }),
        );
        expect(target).toHaveAttribute('data-size', 'content');
        expect(screen.getByRole('region', { name: 'Mensaje' })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: 'Actividad' })).not.toContainElement(target);
        expect(byPart('connection-panel')).toHaveClass('gap-gap-gutter');
    });

    /** A header switched off stays in the table and never reaches the handshake. */
    it('opens with the untouched template and the workspace/environment pair', async () => {
        const open = vi.spyOn(asyncBridge.ws, 'open');
        const urlField = screen.getByRole('textbox', { name: 'URL de la conexión' });

        urlField.textContent = 'wss://nueva.example.test/socket';
        fireEvent.input(urlField);
        fireEvent.click(screen.getByRole('button', { name: 'Conectar' }));

        await waitFor(() => {
            expect(open).toHaveBeenCalledOnce();
        });
        expect(open).toHaveBeenCalledWith({
            connectionId: 'alpha',
            workspaceId: 'payments',
            environmentId: null,
            transport: 'websocket',
            maximumMessageSizeBytes: 104_857_600,
            handshakeTimeoutMs: 20_000,
            reconnect: { baseMs: 500, ceilingMs: 8_000, maxAttempts: 5, spread: 0.2 },
            verifyCertificate: true,
            template: {
                headers: { Authorization: 'Bearer token' },
                url: 'wss://nueva.example.test/socket',
            },
        });
    });

    it('closes the socket of a live connection', () => {
        const close = vi.spyOn(asyncBridge.ws, 'close');

        act(() => {
            fakeBridge.emitState({ connectionId: 'alpha', state: 'open' });
        });

        fireEvent.click(screen.getByRole('button', { name: 'Desconectar' }));

        expect(close).toHaveBeenCalledWith({ connectionId: 'alpha' });
    });

    it('sends the composer draft with Control+Enter', async () => {
        const send = vi.spyOn(asyncBridge.ws, 'send');

        // The description is drawn once it is read, so the composer is the one editor.
        (await editorAt(0)).typeOver('hola');

        fireEvent.keyDown(screen.getByRole('group', { name: 'Editor de mensaje' }), {
            ctrlKey: true,
            key: 'Enter',
        });

        await waitFor(() => {
            expect(send).toHaveBeenCalledOnce();
        });
        expect(send).toHaveBeenCalledWith({
            connectionId: 'alpha',
            origin: 'Saludo',
            itemPath: 'message/saludo',
            template: 'hola',
            workspaceId: 'payments',
            event: 'Saludo',
        });
    });

    it('sends the composer draft with its visible action', async () => {
        const send = vi.spyOn(asyncBridge.ws, 'send');

        // The description is drawn once it is read, so the composer is the one editor.
        (await editorAt(0)).typeOver('hola');
        fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

        await waitFor(() => {
            expect(send).toHaveBeenCalledOnce();
        });
        expect(send).toHaveBeenCalledWith({
            connectionId: 'alpha',
            origin: 'Saludo',
            itemPath: 'message/saludo',
            template: 'hola',
            workspaceId: 'payments',
            event: 'Saludo',
        });
    });

    it('does not send an empty composer', () => {
        const send = vi.spyOn(asyncBridge.ws, 'send');

        fireEvent.keyDown(screen.getByRole('group', { name: 'Editor de mensaje' }), {
            key: 'Enter',
            metaKey: true,
        });

        expect(send).not.toHaveBeenCalled();
    });

    /** Every change of the socket is a line of the activity, the good ones too; newest on top. */
    it('writes the socket coming up and going down on the activity', () => {
        act(() => {
            fakeBridge.emitState({ connectionId: 'alpha', state: 'connecting' });
            fakeBridge.emitState({ connectionId: 'alpha', state: 'open' });
            fakeBridge.emitState({ connectionId: 'alpha', state: 'closing' });
            fakeBridge.emitState({ connectionId: 'alpha', state: 'closed' });
        });

        expect(
            screen.getAllByText(/^(Conectada|Desconectada)$/u).map((line) => line.textContent),
        ).toEqual(['Desconectada', 'Conectada']);
    });

    /** The toolbar is fused: the environment and the url are one control. No chrome more. */
    it('offers the environment beside the url, and neither the transport nor a gear', () => {
        expect(screen.getByRole('button', { name: /Sin entorno/u })).toBeVisible();
        expect(screen.queryByRole('button', { name: /WebSocket/u })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Ajustes de la conexión' })).toBeNull();
        expect(screen.queryByRole('img', { name: 'Desconectada' })).toBeNull();
    });
});
