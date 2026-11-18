import { MessagesProvider } from '@mandor/i18n';
import { createEnvironment, parseConnection, type Connection } from '@mandor/schema';
import { TooltipProvider } from '@mandor/ui';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SettingsConnectionSection } from '../../../../src/renderer/features/connections/components/dialog/SettingsConnectionSection.js';
import { SettingsHeadersSection } from '../../../../src/renderer/features/connections/components/dialog/SettingsHeadersSection.js';
import { SettingsKeepaliveSection } from '../../../../src/renderer/features/connections/components/dialog/SettingsKeepaliveSection.js';
import { SettingsRetrySection } from '../../../../src/renderer/features/connections/components/dialog/SettingsRetrySection.js';
import { connectionsStore } from '../../../../src/renderer/features/connections/connections-store.js';

const ENVIRONMENT = createEnvironment({ id: 'local', name: 'local', variables: [] });

function connectionOf(changes: Record<string, unknown>): Connection {
    return parseConnection({
        environmentId: null,
        headers: [],
        id: 'orders',
        name: 'Orders',
        transport: 'websocket',
        url: 'ws://localhost:3000',
        ...changes,
    });
}

beforeEach(() => {
    connectionsStore.getState().reset();
});

function draw(ui: React.ReactElement): void {
    render(
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>{ui}</TooltipProvider>
        </MessagesProvider>,
    );
}

describe('the sections of the settings dialog, one by one', () => {
    it('the connection section offers the transport the connection dials with', () => {
        draw(
            <SettingsConnectionSection
                connection={connectionOf({})}
                onConnectionChange={vi.fn()}
            />,
        );

        expect(screen.getByRole('combobox', { name: 'Transporte' })).toBeVisible();
        expect(screen.getByText('WebSocket')).toBeVisible();
    });

    it('the headers section draws one line per header, each on or off', () => {
        connectionsStore.getState().upsertConnection(
            connectionOf({
                environmentId: 'local',
                headers: [
                    { key: 'Authorization', value: 'Bearer token', enabled: true },
                    { key: 'x-off', value: 'kept', enabled: false },
                ],
            }),
        );
        const connection = connectionsStore.getState().connections[0];

        if (connection === undefined) {
            throw new Error('the connection never reached the store');
        }

        draw(
            <SettingsHeadersSection
                connection={connection}
                environment={ENVIRONMENT}
                onConnectionChange={vi.fn()}
                onVariablesChange={() => undefined}
            />,
        );

        const boxes = screen.getAllByRole('checkbox', { name: 'Enviar esta entrada' });

        expect(boxes).toHaveLength(2);
        expect(boxes[0]).toHaveAttribute('aria-checked', 'true');
        expect(boxes[1]).toHaveAttribute('aria-checked', 'false');
    });

    it('the headers section writes the table back as lines, the one switched off kept', () => {
        const onConnectionChange = vi.fn();

        connectionsStore.getState().upsertConnection(
            connectionOf({
                environmentId: 'local',
                headers: [{ key: 'Authorization', value: 'Bearer token', enabled: true }],
            }),
        );
        const connection = connectionsStore.getState().connections[0];

        if (connection === undefined) {
            throw new Error('the connection never reached the store');
        }

        draw(
            <SettingsHeadersSection
                connection={connection}
                environment={ENVIRONMENT}
                onConnectionChange={onConnectionChange}
                onVariablesChange={() => undefined}
            />,
        );

        const boxes = screen.getAllByRole('checkbox', { name: 'Enviar esta entrada' });
        const on = boxes[0];

        if (on === undefined) {
            throw new Error('the sent header has no switch');
        }

        fireEvent.click(on);

        expect(onConnectionChange).toHaveBeenCalledWith({
            headers: [{ key: 'Authorization', value: 'Bearer token', enabled: false }],
        });
    });

    it('the retry section shows the policy a default connection comes back by', () => {
        const connection = connectionOf({});

        draw(<SettingsRetrySection connection={connection} onConnectionChange={vi.fn()} />);

        expect(
            screen.getByRole('switch', { name: 'Reconectar cuando el servidor cuelga' }),
        ).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByText('5')).toBeVisible();
    });

    it('the keepalive section shows a beat that is off until somebody asks for it', () => {
        const connection = connectionOf({});

        draw(<SettingsKeepaliveSection connection={connection} onConnectionChange={vi.fn()} />);

        expect(screen.getByRole('switch', { name: 'Enviar un ping periódico' })).toHaveAttribute(
            'aria-checked',
            'false',
        );
    });

    it('the keepalive section writes only what the connection decided over the app', () => {
        const onConnectionChange = vi.fn();

        draw(
            <SettingsKeepaliveSection
                connection={connectionOf({})}
                onConnectionChange={onConnectionChange}
            />,
        );

        fireEvent.click(screen.getByRole('switch', { name: 'Enviar un ping periódico' }));

        expect(onConnectionChange).toHaveBeenCalledWith({ keepalive: { enabled: true } });
    });

    it('a row the connection keeps hands it back, and the rest say where they come from', () => {
        const onConnectionChange = vi.fn();

        draw(
            <SettingsKeepaliveSection
                connection={connectionOf({ keepalive: { enabled: true, intervalMs: 5000 } })}
                onConnectionChange={onConnectionChange}
            />,
        );

        expect(screen.getAllByText('Por defecto en')).toHaveLength(1);

        const resets = screen.getAllByRole('button', { name: 'Usar el valor por defecto' });

        expect(resets).toHaveLength(2);

        fireEvent.click(resets[1] as Element);

        expect(onConnectionChange).toHaveBeenCalledWith({ keepalive: { enabled: true } });
    });

    it('the retry section hides its policy while the connection does not come back', () => {
        draw(
            <SettingsRetrySection
                connection={connectionOf({ retry: { enabled: false } })}
                onConnectionChange={vi.fn()}
            />,
        );

        expect(screen.queryByRole('textbox', { name: 'Intentos' })).toBeNull();
    });
});
