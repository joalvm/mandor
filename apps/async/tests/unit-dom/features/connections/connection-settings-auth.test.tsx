import { MessagesProvider } from '@mandor/i18n';
import { success } from '@mandor/ipc';
import { bridge } from '@mandor/shell';
import { createEnvironment, parseConnection, type Connection } from '@mandor/schema';
import { TooltipProvider } from '@mandor/ui';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConnectionAuthSection } from '../../../../src/renderer/features/connections/components/dialog/ConnectionAuthSection.js';
import { HANDSHAKE_SCHEMES } from '../../../../src/renderer/features/connections/lib/handshake-schemes.js';

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

function draw(ui: React.ReactElement): void {
    render(
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>{ui}</TooltipProvider>
        </MessagesProvider>,
    );
}

beforeEach(() => {
    vi.spyOn(bridge.auth, 'read').mockResolvedValue(success({ auth: { type: 'none' } }));
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('the auth of the handshake in the settings dialog', () => {
    it('draws the editor of the connection and names who carries the auth that applies', async () => {
        draw(
            <ConnectionAuthSection
                connection={connectionOf({})}
                environment={ENVIRONMENT}
                onConnectionChange={vi.fn()}
                onVariablesChange={() => undefined}
                workspaceId="payments"
            />,
        );

        expect(bridge.auth.read).toHaveBeenCalledWith({
            workspaceId: 'payments',
        });
        expect(await screen.findByRole('combobox', { name: 'Tipo' })).toBeVisible();
        expect(screen.getByText('El workspace lleva la auth que aplica.')).toBeVisible();
    });

    it('writes the scheme the reader chose as the auth of the connection', async () => {
        const onConnectionChange = vi.fn();

        draw(
            <ConnectionAuthSection
                connection={connectionOf({})}
                environment={ENVIRONMENT}
                onConnectionChange={onConnectionChange}
                onVariablesChange={() => undefined}
                workspaceId="payments"
            />,
        );

        await screen.findByRole('combobox', { name: 'Tipo' });

        const combobox = screen.getByRole('combobox', { name: 'Tipo' });

        fireEvent.keyDown(combobox, { key: 'ArrowDown' });

        const listbox = await screen.findByRole('listbox');

        fireEvent.click(within(listbox).getByRole('option', { name: 'Basic' }));

        expect(onConnectionChange).toHaveBeenCalledWith({
            auth: { type: 'basic', username: '', password: '' },
        });
    });

    /** The handshake opens once, with no challenge to answer and no signer behind it. */
    it('offers neither digest nor an AWS signature, which the handshake does not apply', async () => {
        draw(
            <ConnectionAuthSection
                connection={connectionOf({})}
                environment={ENVIRONMENT}
                onConnectionChange={vi.fn()}
                onVariablesChange={() => undefined}
                workspaceId="payments"
            />,
        );

        fireEvent.keyDown(await screen.findByRole('combobox', { name: 'Tipo' }), {
            key: 'ArrowDown',
        });

        const listbox = await screen.findByRole('listbox');

        expect(within(listbox).getByRole('option', { name: 'Bearer' })).toBeVisible();
        expect(within(listbox).queryByRole('option', { name: 'Digest' })).toBeNull();
        expect(within(listbox).queryByRole('option', { name: 'AWS Signature' })).toBeNull();
        expect(HANDSHAKE_SCHEMES).not.toContain('digest');
    });
});
