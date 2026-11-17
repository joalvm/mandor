import { MessagesProvider } from '@mandor/i18n';
import { createConnection } from '@mandor/schema';
import { TooltipProvider } from '@mandor/ui';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from 'zustand';
import type { ReactNode } from 'react';

import { ConnectionSettingsDialog } from '../../../../src/renderer/features/connections/components/dialog/ConnectionSettingsDialog.js';
import { connectionsStore } from '../../../../src/renderer/features/connections/connections-store.js';

const SCOPE = { workspaceId: 'events' };

function connectionOf(changes: Record<string, unknown>) {
    return createConnection({
        id: 'orders',
        name: 'Orders',
        url: 'ws://localhost:3000',
        ...changes,
    });
}

function Holder({ connectionId }: { connectionId: string }): ReactNode {
    const connection = useStore(connectionsStore, (state) =>
        state.connections.find((entry) => entry.id === connectionId),
    );

    if (connection === undefined) {
        return null;
    }

    return (
        <ConnectionSettingsDialog
            closeLabel="Cerrar"
            connection={connection}
            onOpenChange={() => undefined}
            open
            scope={SCOPE}
        />
    );
}

function draw(changes: Record<string, unknown> = {}) {
    const connection = connectionOf(changes);

    connectionsStore.getState().upsertConnection(connection);

    return render(
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>
                <Holder connectionId={connection.id} />
            </TooltipProvider>
        </MessagesProvider>,
    );
}

function stored(): Record<string, unknown> {
    return connectionsStore.getState().connections[0] as unknown as Record<string, unknown>;
}

/** Types into the first field of that name: a table of pairs also draws the empty row last. */
function type(name: string, value: string): void {
    const [field] = screen.getAllByRole('textbox', { name });

    if (field === undefined) {
        throw new Error(`no field named ${name}`);
    }

    field.textContent = value;
    fireEvent.input(field);
}

beforeEach(() => {
    connectionsStore.getState().reset();
});

describe('the socket.io settings of the dialog', () => {
    it('shows the auth section only for a connection that speaks socket.io', () => {
        const view = draw({ transport: 'socketio', url: 'http://localhost:3000' });

        expect(screen.getByRole('option', { name: 'Auth' })).toBeVisible();
        view.unmount();
        connectionsStore.getState().reset();

        draw({});

        expect(screen.queryByRole('option', { name: 'Auth' })).toBeNull();
    });

    it('writes the namespace of a socket.io connection into its own group', () => {
        draw({ transport: 'socketio', url: 'http://localhost:3000' });
        type('Namespace', '/admin');

        expect(stored()['socketio']).toEqual({ namespace: '/admin' });
    });

    /** A v2 server only answers a v2 client: the version is the server's, and the file keeps it. */
    it('writes the protocol version the server speaks into the socketio group', async () => {
        draw({ transport: 'socketio', url: 'http://localhost:3000' });

        const combobox = screen.getByRole('combobox', { name: 'Versión del protocolo' });

        expect(combobox).toHaveTextContent('v3 / v4');

        fireEvent.keyDown(combobox, { key: 'ArrowDown' });
        fireEvent.click(
            within(await screen.findByRole('listbox')).getByRole('option', { name: 'v2' }),
        );

        expect(stored()['socketio']).toEqual({ version: 'v2' });
    });

    it('writes the handshake wait the connection decides, and nothing while it follows the app', () => {
        draw({ transport: 'socketio', url: 'http://localhost:3000' });

        expect(stored()['handshake']).toBeUndefined();

        type('Timeout del handshake', '5000');

        expect(stored()['handshake']).toEqual({ timeoutMs: 5_000 });
    });

    /** MessageSizeRow: a Socket.IO frame is a websocket frame underneath, with the same ceiling. */
    it('writes the maximum message size the connection decides into the socketio group', () => {
        draw({ transport: 'socketio', url: 'http://localhost:3000' });

        expect(screen.getByRole('textbox', { name: 'Tamaño máximo de mensaje' })).toHaveTextContent(
            '102400',
        );

        type('Tamaño máximo de mensaje', '64');

        expect(stored()['socketio']).toEqual({ maximumMessageSizeKiB: 64 });
    });

    it('keeps a half-written namespace off the connection', () => {
        draw({ transport: 'socketio', url: 'http://localhost:3000' });
        type('Namespace', 'admin');

        expect(stored()['socketio']).toBeUndefined();
    });

    it('writes an auth entry into the socketio group of the connection', () => {
        draw({ transport: 'socketio', url: 'http://localhost:3000' });
        fireEvent.click(screen.getByRole('option', { name: 'Auth' }));
        type('Clave', 'token');
        type('Valor', '{{token}}');

        expect(stored()['socketio']).toEqual({
            auth: { token: '{{token}}' },
            disabledAuth: {},
        });
    });
});
