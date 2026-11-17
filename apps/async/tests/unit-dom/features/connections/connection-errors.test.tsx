import { MessagesProvider } from '@mandor/i18n';
import { failure, success } from '@mandor/ipc';
import { shellStore } from '@mandor/shell';
import { ToastProvider, TooltipProvider } from '@mandor/ui';
import { allByPart, byPart } from '@mandor/ui/testing';
import { editorAt } from '@mandor/ui/testing/editors-in';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { activityStore } from '../../../../src/renderer/activity/activity-store.js';
import { asyncBridge } from '../../../../src/renderer/app/async-bridge.js';
import { connectionsStore } from '../../../../src/renderer/features/connections/index.js';
import { ConnectionPanel } from '../../../../src/renderer/features/connections/components/panel/ConnectionPanel.js';

import { flush } from '../../support/flush.js';

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

function faultRow(): HTMLElement | undefined {
    return allByPart('activity-fault-row')[0];
}

import { composerEventsStore } from '../../../../src/renderer/events/composer-events-store.js';
import { openComposerEvent } from './support/open-composer-event.js';

beforeEach(() => {
    composerEventsStore.getState().reset();
    openComposerEvent('alpha');
    activityStore.getState().reset();
    shellStore.getState().reset();
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
    connectionsStore.getState().reset();
    connectionsStore.getState().upsertConnection({
        id: 'alpha',
        name: 'Gateway',
        transport: 'websocket',
        url: 'wss://example.test/socket',
        headers: [],
        environmentId: null,
    });

    render(<ConnectionPanel connectionId="alpha" resource={RESOURCE} />, {
        wrapper: Wrapper,
    });
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    vi.restoreAllMocks();
    shellStore.getState().reset();
});

describe('the connection panel errors', () => {
    /** The interface decides on the code alone; the raw message from main stays in the log. */
    it('writes the translated text of the code into the activity when opening fails', async () => {
        vi.spyOn(asyncBridge.ws, 'open').mockResolvedValue(
            failure('ws-open-failed', 'raw detail from main'),
        );

        fireEvent.click(screen.getByRole('button', { name: 'Conectar' }));
        await flush();

        const row = faultRow();

        expect(row).toHaveTextContent('No se pudo abrir la conexión.');
        expect(row).not.toHaveTextContent('raw detail from main');
    });

    /**
     * A failure is one more line of the timeline, never a banner stealing panel height. The
     * editor keeps a live region of its own on the page for a screen reader, empty and off
     * screen, and that one is not over the panel.
     */
    it('never raises a banner over the panel for a network failure', async () => {
        vi.spyOn(asyncBridge.ws, 'open').mockResolvedValue(
            failure('ws-open-failed', 'raw detail from main'),
        );

        fireEvent.click(screen.getByRole('button', { name: 'Conectar' }));
        await flush();

        expect(faultRow()).not.toBeUndefined();
        expect(within(byPart('connection-panel')).queryByRole('alert')).toBeNull();
    });

    it('writes the translated text of the code into the activity when sending fails', async () => {
        vi.spyOn(asyncBridge.ws, 'send').mockResolvedValue(
            failure('ws-send-failed', 'raw detail from main'),
        );

        // The description is drawn once it is read, so the composer is the one editor.
        (await editorAt(0)).typeOver('hola');

        fireEvent.keyDown(screen.getByRole('group', { name: 'Editor de mensaje' }), {
            ctrlKey: true,
            key: 'Enter',
        });
        await flush();

        expect(faultRow()).toHaveTextContent(
            'No se pudo enviar el mensaje porque el socket no está abierto.',
        );
    });

    it('clears the failure when a new connection attempt starts', async () => {
        const open = vi
            .spyOn(asyncBridge.ws, 'open')
            .mockResolvedValue(failure('ws-open-failed', 'raw detail from main'));

        fireEvent.click(screen.getByRole('button', { name: 'Conectar' }));
        await flush();

        expect(faultRow()).toBeVisible();

        open.mockResolvedValue(success({}));

        fireEvent.click(screen.getByRole('button', { name: 'Conectar' }));
        await flush();

        expect(faultRow()).toBeUndefined();
    });
});
