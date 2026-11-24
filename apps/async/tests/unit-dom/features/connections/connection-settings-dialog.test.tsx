import { MessagesProvider } from '@mandor/i18n';
import { createConnection, type Connection } from '@mandor/schema';
import { TooltipProvider } from '@mandor/ui';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from 'zustand';
import type { ReactNode } from 'react';

import { ConnectionSettingsDialog } from '../../../../src/renderer/features/connections/components/dialog/ConnectionSettingsDialog.js';
import { connectionsStore } from '../../../../src/renderer/features/connections/connections-store.js';

const SCOPE = { workspaceId: 'events' };

const FRAME = '{"event":"{{event}}","data":{{payload}}}';

/** A new connection with `changes` over it; groups a new connection does not take ride as given. */
function connectionOf(changes: Record<string, unknown>): Connection {
    return {
        ...createConnection({ id: 'orders', name: 'Orders', url: 'ws://localhost:3000' }),
        ...changes,
    };
}

/**
 * The dialog writes through the same pause every edit of the connection travels by, and the
 * record changes at once. What a test reads back is the store, which is also where the row of
 * the collection reads the connection from — so the holder does the same, and the dialog sees
 * what it wrote the way it would in the window.
 */
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

function stored(): Connection {
    const connection = connectionsStore.getState().connections[0];

    if (connection === undefined) {
        throw new Error('the store holds no connection');
    }

    return connection;
}

function type(name: string, value: string): void {
    const field = screen.getByRole('textbox', { name });

    field.textContent = value;
    fireEvent.input(field);
}

beforeEach(() => {
    connectionsStore.getState().reset();
});

describe('the settings dialog of a connection', () => {
    it('offers the four sections and opens on the connection one', () => {
        draw();

        expect(screen.getByRole('listbox', { name: 'Secciones de la conexión' })).toBeVisible();
        expect(
            screen.getByRole('switch', { name: 'Verificar el certificado del servidor' }),
        ).toHaveAttribute('aria-checked', 'true');
    });

    /** A change reaches the next connect, not the socket that is up: the dialog says so in place. */
    it('says the changes wait for the next connect while the socket is dialed', () => {
        draw();

        expect(screen.queryByText('Los cambios se aplican al reconectar.')).toBeNull();

        act(() => {
            connectionsStore.getState().setConnectionState(stored().id, 'open');
        });

        expect(screen.getByText('Los cambios se aplican al reconectar.')).toBeVisible();

        act(() => {
            connectionsStore.getState().setConnectionState(stored().id, 'closed');
        });

        expect(screen.queryByText('Los cambios se aplican al reconectar.')).toBeNull();
    });

    it('blocks no field while it says so', () => {
        draw();

        act(() => {
            connectionsStore.getState().setConnectionState(stored().id, 'reconnecting');
        });

        expect(screen.getByText('Los cambios se aplican al reconectar.')).toBeVisible();
        expect(
            screen.getByRole('switch', { name: 'Verificar el certificado del servidor' }),
        ).toBeEnabled();
    });

    it('shows the websocket settings only for a connection that speaks websocket', () => {
        const view = draw();

        expect(screen.getByRole('textbox', { name: 'Subprotocolos' })).toBeVisible();
        view.unmount();
        connectionsStore.getState().reset();

        draw({ transport: 'socketio', url: 'http://localhost:3000' });

        expect(screen.queryByRole('textbox', { name: 'Subprotocolos' })).toBeNull();
        expect(screen.getByRole('textbox', { name: 'Namespace' })).toBeVisible();
    });

    it('writes the maximum message size in the unit the box shows, and nothing else', () => {
        draw({});
        type('Tamaño máximo de mensaje', '64');

        expect(stored().websocket).toEqual({ maximumMessageSizeKiB: 64 });
    });

    it('keeps the frame and the subprotocols when a limit is handed back to the defaults', () => {
        draw({ websocket: { frame: FRAME, maximumMessageSizeKiB: 64 } });
        fireEvent.click(screen.getByRole('button', { name: 'Usar el valor por defecto' }));

        expect(stored().websocket).toEqual({ frame: FRAME });
    });

    it('keeps a half-written number off the connection', () => {
        draw({});
        type('Tamaño máximo de mensaje', '6e');

        expect(stored().websocket).toBeUndefined();
    });

    it('turns the retry policy off and keeps only that decision over the defaults', () => {
        draw({});
        fireEvent.click(screen.getByRole('option', { name: 'Reintento' }));
        fireEvent.click(
            screen.getByRole('switch', { name: 'Reconectar cuando el servidor cuelga' }),
        );

        expect(stored().retry).toEqual({ enabled: false });
    });

    it('switches a header off and keeps its line instead of losing it', () => {
        draw({ headers: [{ key: 'Authorization', value: 'Bearer token', enabled: true }] });
        fireEvent.click(screen.getByRole('option', { name: 'Headers' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Enviar esta entrada' }));

        expect(stored().headers).toEqual([
            { key: 'Authorization', value: 'Bearer token', enabled: false },
        ]);
        expect(screen.getByRole('checkbox', { name: 'Enviar esta entrada' })).toHaveAttribute(
            'aria-checked',
            'false',
        );
    });

    it('ends in an empty row ready to be filled, and persists nothing for it', () => {
        draw({});
        fireEvent.click(screen.getByRole('option', { name: 'Headers' }));

        expect(screen.getAllByRole('textbox', { name: 'Clave' })).toHaveLength(1);
        expect(stored().headers).toEqual([]);
    });

    it('removes a line and stops naming the header it carried', () => {
        draw({ headers: [{ key: 'Authorization', value: 'Bearer token', enabled: true }] });
        fireEvent.click(screen.getByRole('option', { name: 'Headers' }));
        fireEvent.click(screen.getByRole('button', { name: 'Quitar entrada' }));

        expect(stored().headers).toEqual([]);
        expect(screen.getAllByRole('textbox', { name: 'Clave' })).toHaveLength(1);
    });

    it('edits a value in place through the field that names variables', () => {
        draw({
            environmentId: 'local',
            headers: [{ key: 'Authorization', value: 'Bearer token', enabled: true }],
        });
        fireEvent.click(screen.getByRole('option', { name: 'Headers' }));

        const [value] = screen.getAllByRole('textbox', { name: 'Valor' });

        (value as Element).textContent = 'Basic abc';
        fireEvent.input(value as Element);

        expect(stored().headers).toEqual([
            { key: 'Authorization', value: 'Basic abc', enabled: true },
        ]);
    });

    /** The handshake headers promise a type for their value, the way the params do. */
    it('offers a type for each header line', () => {
        draw({ headers: [{ key: 'X-Retries', value: '3', enabled: true }] });
        fireEvent.click(screen.getByRole('option', { name: 'Headers' }));

        expect(screen.getAllByRole('button', { name: 'Tipo' }).length).toBeGreaterThan(0);
    });
});
