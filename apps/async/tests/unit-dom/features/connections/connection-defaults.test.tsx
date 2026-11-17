import { MessagesProvider } from '@mandor/i18n';
import { SettingsDialog } from '@mandor/prefs';
import { parseConnection, type Connection } from '@mandor/schema';
import { TooltipProvider } from '@mandor/ui';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConnectionDefaultsSection } from '../../../../src/renderer/features/connections/components/dialog/ConnectionDefaultsSection.js';
import { SettingsRetrySection } from '../../../../src/renderer/features/connections/components/dialog/SettingsRetrySection.js';
import {
    CONNECTION_DEFAULTS_STORAGE_KEY,
    connectionDefaultsStore,
    readConnectionDefaults,
} from '../../../../src/renderer/features/connections/connection-defaults-store.js';
import { FACTORY_CONNECTION_DEFAULTS } from '../../../../src/renderer/features/connections/lib/connection-settings.js';
import { openOptionsOf } from '../../../../src/renderer/features/connections/lib/open-options.js';
import { ConnectionDefaultsSettings } from '../../../../src/renderer/features/connections/ConnectionDefaultsSettings.js';

afterEach(() => {
    cleanup();
    window.localStorage.clear();
    connectionDefaultsStore.setState({ defaults: FACTORY_CONNECTION_DEFAULTS });
});

function keep(value: unknown): void {
    window.localStorage.setItem(CONNECTION_DEFAULTS_STORAGE_KEY, JSON.stringify(value));
}

function connectionOf(changes: Record<string, unknown> = {}): Connection {
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

function draw(ui: ReactElement): void {
    render(
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>{ui}</TooltipProvider>
        </MessagesProvider>,
    );
}

describe('the defaults of the connections as the app keeps them', () => {
    it('are the factory ones until something is kept', () => {
        expect(readConnectionDefaults()).toEqual(FACTORY_CONNECTION_DEFAULTS);
    });

    it('read each group kept over the factory, so a setting added later still has a value', () => {
        keep({ keepalive: { enabled: true }, retry: { attempts: 9 } });

        expect(readConnectionDefaults()).toEqual({
            ...FACTORY_CONNECTION_DEFAULTS,
            keepalive: { ...FACTORY_CONNECTION_DEFAULTS.keepalive, enabled: true },
            retry: { ...FACTORY_CONNECTION_DEFAULTS.retry, attempts: 9 },
        });
    });

    it('drop a group that does not read, and keep the ones that do', () => {
        keep({ retry: { attempts: 0 }, socketio: { ackTimeoutMs: 700 } });

        expect(readConnectionDefaults()).toEqual({
            ...FACTORY_CONNECTION_DEFAULTS,
            socketio: { ...FACTORY_CONNECTION_DEFAULTS.socketio, ackTimeoutMs: 700 },
        });

        window.localStorage.setItem(CONNECTION_DEFAULTS_STORAGE_KEY, '{not json');

        expect(readConnectionDefaults()).toEqual(FACTORY_CONNECTION_DEFAULTS);
    });

    it('stay for this run when the storage refuses them', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('full');
        });

        connectionDefaultsStore.getState().setDefaults({
            ...FACTORY_CONNECTION_DEFAULTS,
            socketio: { ...FACTORY_CONNECTION_DEFAULTS.socketio, ackTimeoutMs: 700 },
        });

        expect(connectionDefaultsStore.getState().defaults.socketio.ackTimeoutMs).toBe(700);

        vi.restoreAllMocks();
    });

    it('reach the open of a connection that left them alone', () => {
        const defaults = {
            ...FACTORY_CONNECTION_DEFAULTS,
            websocket: { maximumMessageSizeKiB: 64, verifyCertificate: false },
        };

        expect(openOptionsOf(connectionOf(), defaults)).toMatchObject({
            maximumMessageSizeBytes: 64 * 1024,
            verifyCertificate: false,
        });
    });
});

// The section draws the rows a connection draws — RetryRows, KeepaliveRows, WebsocketLimitRows
// and AckTimeoutRow — over the defaults instead of over a connection; a connection reads them
// through useConnectionOverrides.
describe('the section of the defaults in the settings of the app', () => {
    it('writes a default the next open of every connection that left it alone uses', () => {
        draw(<ConnectionDefaultsSection />);

        expect(screen.queryByText('Default from')).toBeNull();

        fireEvent.click(screen.getByRole('switch', { name: 'Send a periodic ping' }));

        expect(connectionDefaultsStore.getState().defaults.keepalive.enabled).toBe(true);
        expect(readConnectionDefaults().keepalive.enabled).toBe(true);
    });

    it('writes the handshake wait every connection that keeps none of its own dials with', () => {
        draw(<ConnectionDefaultsSection />);

        const field = screen.getByRole('textbox', { name: 'Handshake timeout' });

        field.textContent = '4000';
        fireEvent.input(field);

        expect(readConnectionDefaults().handshake).toEqual({ timeoutMs: 4_000 });
    });

    it('is reached from the line under a row of a connection that follows it', () => {
        draw(
            <>
                <ConnectionDefaultsSettings />
                <SettingsRetrySection connection={connectionOf()} onConnectionChange={vi.fn()} />
                <SettingsDialog />
            </>,
        );

        fireEvent.click(screen.getAllByRole('button', { name: 'Settings' })[0] as Element);

        expect(screen.getByRole('dialog', { name: 'Connections' })).toBeVisible();

        fireEvent.click(screen.getByRole('button', { name: 'Close settings' }));
    });

    it('shows what a connection would use while it keeps nothing of its own', () => {
        connectionDefaultsStore.getState().setDefaults({
            ...FACTORY_CONNECTION_DEFAULTS,
            retry: { ...FACTORY_CONNECTION_DEFAULTS.retry, enabled: false },
        });

        draw(<SettingsRetrySection connection={connectionOf()} onConnectionChange={vi.fn()} />);

        expect(
            screen.getByRole('switch', { name: 'Reconnect when the server hangs up' }),
        ).toHaveAttribute('aria-checked', 'false');
    });
});
