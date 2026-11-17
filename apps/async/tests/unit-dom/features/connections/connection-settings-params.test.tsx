import { MessagesProvider } from '@mandor/i18n';
import { parseConnection, type Connection, type Environment } from '@mandor/schema';
import { TooltipProvider } from '@mandor/ui';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SettingsParamsSection } from '../../../../src/renderer/features/connections/components/dialog/SettingsParamsSection.js';

function connectionOf(changes: Record<string, unknown>): Connection {
    return parseConnection({
        environmentId: null,
        headers: [],
        id: 'gateway',
        name: 'Gateway',
        params: [
            { key: 'room', value: '1', enabled: true },
            { key: 'draft', value: 'x', enabled: false },
        ],
        transport: 'websocket',
        url: 'wss://gateway.example/socket',
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

function drawParams(
    connection: Connection,
    environment: Environment | undefined,
    onChange: (changes: unknown) => void,
): void {
    draw(
        <SettingsParamsSection
            connection={connection}
            environment={environment}
            onConnectionChange={onChange}
            onVariablesChange={() => undefined}
        />,
    );
}

afterEach(cleanup);

describe('the params of a connection', () => {
    it('reads the composed url with the on params riding after the query the url carries', () => {
        drawParams(
            connectionOf({ url: 'wss://gateway.example/socket?live=1' }),
            undefined,
            vi.fn(),
        );

        expect(screen.getByText('URL efectiva')).toBeVisible();
        expect(screen.getByText('wss://gateway.example/socket?live=1&room=1')).toBeVisible();
    });

    it('resolves the variables of the environment the connection owns', () => {
        drawParams(
            connectionOf({
                params: [{ key: 'token', value: '{{token}}', enabled: true }],
            }),
            {
                id: 'local',
                name: 'Local',
                variables: [{ enabled: true, name: 'token', secret: false, value: 'abc' }],
            },
            vi.fn(),
        );

        expect(screen.getByText('wss://gateway.example/socket?token=abc')).toBeVisible();
    });

    it('writes the table back into the params of the connection', () => {
        const change = vi.fn();

        drawParams(connectionOf({}), undefined, change);

        const keys = screen.getAllByRole('textbox', { name: 'Clave' });
        const ghost = keys[keys.length - 1];

        if (ghost === undefined) {
            throw new Error('la fila vacía no está');
        }

        fireEvent.focus(ghost);
        ghost.textContent = 'team';
        fireEvent.input(ghost);

        const write = change.mock.calls[0]?.[0] as unknown as { params?: unknown[] };

        expect(write.params).toEqual([
            expect.objectContaining({ enabled: true, key: 'room', value: '1' }),
            expect.objectContaining({ enabled: false, key: 'draft', value: 'x' }),
            expect.objectContaining({ enabled: true, key: 'team', value: '' }),
        ]);
    });

    it('offers the type of a pair under the popover of its row', () => {
        drawParams(connectionOf({}), undefined, vi.fn());

        expect(screen.getAllByRole('button', { name: 'Tipo' }).length).toBeGreaterThan(0);
    });
});
