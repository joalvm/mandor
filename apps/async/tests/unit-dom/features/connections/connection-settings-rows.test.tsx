import { MessagesProvider } from '@mandor/i18n';
import { parseConnection, type Connection } from '@mandor/schema';
import { TooltipProvider } from '@mandor/ui';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SettingsAuthSection } from '../../../../src/renderer/features/connections/components/dialog/SettingsAuthSection.js';
import { SocketIoSettingsRows } from '../../../../src/renderer/features/connections/components/dialog/SocketIoSettingsRows.js';
import { WebsocketSettingsRows } from '../../../../src/renderer/features/connections/components/dialog/WebsocketSettingsRows.js';

const ENVIRONMENT = undefined;

function connectionOf(changes: Record<string, unknown>): Connection {
    return parseConnection({
        environmentId: null,
        headers: [],
        id: 'gateway',
        name: 'Gateway',
        transport: 'socketio',
        url: 'https://localhost:3000',
        ...changes,
    });
}

function draw(ui: React.ReactElement): void {
    render(
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>{ui}</TooltipProvider>
        </MessagesProvider>,
    );
}

function noop(): void {
    return undefined;
}

describe('the rows each transport dials with', () => {
    it('the socket.io rows name its namespace, engine path, engine transport and ack wait', () => {
        draw(<SocketIoSettingsRows connection={connectionOf({})} onConnectionChange={vi.fn()} />);

        expect(screen.getByRole('textbox', { name: 'Namespace' })).toBeVisible();
        expect(screen.getByRole('textbox', { name: 'Path de engine' })).toBeVisible();
        expect(screen.getByRole('combobox', { name: 'Transporte del engine' })).toBeVisible();
        expect(screen.getByText('Tiempo de ack')).toBeVisible();
    });

    it('the websocket rows name its subprotocols, frame ceiling and certificate', () => {
        draw(<WebsocketSettingsRows connection={connectionOf({})} onConnectionChange={vi.fn()} />);

        expect(screen.getByRole('textbox', { name: 'Subprotocolos' })).toBeVisible();
        expect(screen.getByText('Tamaño máximo de mensaje')).toBeVisible();
        expect(screen.getByText('Verificar el certificado del servidor')).toBeVisible();
    });
});

describe('the frame template of a websocket connection', () => {
    it('offers the row and shows the template the connection already wraps with', () => {
        draw(
            <WebsocketSettingsRows
                connection={connectionOf({
                    transport: 'websocket',
                    url: 'ws://localhost:3000',
                    websocket: { frame: '{"event": {{event}}}' },
                })}
                onConnectionChange={vi.fn()}
            />,
        );

        expect(screen.getByRole('textbox', { name: 'Plantilla del frame' })).toHaveTextContent(
            '{"event": {{event}}}',
        );
        // The help names the two tokens the template may carry, and they leave the message as written.
        expect(screen.getByText(/evento y el mensaje/)).toHaveTextContent('{{event}}');
    });

    it('writes the template when the draft parses', () => {
        const change = vi.fn();

        draw(
            <WebsocketSettingsRows
                connection={connectionOf({ transport: 'websocket', url: 'ws://localhost:3000' })}
                onConnectionChange={change}
            />,
        );

        const box = screen.getByRole('textbox', { name: 'Plantilla del frame' });

        fireEvent.input(box, { target: { textContent: '{"data": {{payload}}}' } });

        const write = change.mock.calls[0]?.[0] as unknown as { websocket?: { frame?: string } };

        expect(write.websocket?.frame).toBe('{"data": {{payload}}}');
    });

    it('keeps the saved template while the draft does not parse, and writes nothing', () => {
        const change = vi.fn();

        draw(
            <WebsocketSettingsRows
                connection={connectionOf({
                    transport: 'websocket',
                    url: 'ws://localhost:3000',
                    websocket: { frame: '{"a": 1}' },
                })}
                onConnectionChange={change}
            />,
        );

        const box = screen.getByRole('textbox', { name: 'Plantilla del frame' });

        fireEvent.input(box, { target: { textContent: '{"a": {{event}}' } });

        expect(box).toHaveTextContent('{"a": {{event}}');
        expect(change).not.toHaveBeenCalled();
    });

    it('leaves the template out of the connection when the draft goes blank', () => {
        const change = vi.fn();

        draw(
            <WebsocketSettingsRows
                connection={connectionOf({
                    transport: 'websocket',
                    url: 'ws://localhost:3000',
                    websocket: { frame: '{"a": 1}' },
                })}
                onConnectionChange={change}
            />,
        );

        const box = screen.getByRole('textbox', { name: 'Plantilla del frame' });

        fireEvent.input(box, { target: { textContent: '' } });

        const write = change.mock.calls[0]?.[0] as unknown as { websocket?: { frame?: string } };

        expect(write.websocket?.frame).toBeUndefined();
    });
});

describe('the auth entries of a Socket.IO connection, as lines of records (useRecordLines)', () => {
    function drawAuth(onConnectionChange: () => void): void {
        draw(
            <SettingsAuthSection
                connection={connectionOf({
                    socketio: {
                        auth: { Authorization: 'token' },
                        disabledAuth: { 'x-off': 'kept' },
                    },
                })}
                environment={ENVIRONMENT}
                onConnectionChange={onConnectionChange}
                onVariablesChange={noop}
            />,
        );
    }

    it('draws the sent entries first, the ones on hold after, and the empty row that adds one', () => {
        drawAuth(vi.fn());

        const boxes = screen.getAllByRole('checkbox', { name: 'Enviar esta entrada' });

        expect(boxes).toHaveLength(2);
        expect(boxes[0]).toHaveAttribute('aria-checked', 'true');
        expect(boxes[1]).toHaveAttribute('aria-checked', 'false');
        expect(screen.getAllByRole('textbox', { name: 'Clave' })).toHaveLength(3);
    });

    it('writes the records when a line moves from sent to on hold', () => {
        const onConnectionChange = vi.fn();

        drawAuth(onConnectionChange);
        fireEvent.click(
            screen.getByRole('checkbox', { checked: true, name: 'Enviar esta entrada' }),
        );

        expect(onConnectionChange.mock.lastCall?.[0]).toMatchObject({
            socketio: { auth: {}, disabledAuth: { Authorization: 'token', 'x-off': 'kept' } },
        });
    });
});
