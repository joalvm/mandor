import type { WsState } from '@mandor/ipc';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConnectionIndicator } from '../../../../src/renderer/features/connections/components/tab/ConnectionIndicator.js';
import { connectionsStore } from '../../../../src/renderer/features/connections/connections-store.js';
import { retryConnectionNow } from '../../../../src/renderer/features/connections/lib/retry-connection.js';

import { AppProviders } from '../../support/app-providers.js';
import { fakeConnection } from './support/fake-connections.js';

vi.mock('../../../../src/renderer/features/connections/lib/retry-connection.js', () => ({
    retryConnectionNow: vi.fn(),
}));

function draw(connectionId = 'alpha'): void {
    render(<ConnectionIndicator connectionId={connectionId} />, { wrapper: AppProviders });
}

beforeEach(() => {
    connectionsStore.getState().reset();
    connectionsStore.getState().upsertConnection(fakeConnection('alpha', 'Gateway'));
});

afterEach(() => {
    cleanup();
    connectionsStore.getState().reset();
});

describe('what a connection looks like beside its name', () => {
    it('shows the logo of the transport it dials with and the state of its socket', () => {
        connectionsStore.getState().setConnectionState('alpha', 'open');

        draw();

        expect(document.querySelector('[data-part="websocket-logo"]')).not.toBeNull();
        expect(screen.getByRole('img', { name: 'Connected' })).toHaveAttribute(
            'data-state',
            'connected',
        );
    });

    it.each<[WsState, string]>([
        ['connecting', 'Connecting'],
        ['closed', 'Disconnected'],
        ['reconnecting', 'Connecting'],
    ])('reads the state %s the socket reports', (wsState, label) => {
        connectionsStore.getState().setConnectionState('alpha', wsState);

        draw();

        expect(screen.getByRole('img', { name: label })).toBeVisible();
    });

    it('shows the attempt count beside the indicator while it retries', () => {
        connectionsStore.getState().setConnectionState('alpha', 'reconnecting', 3);

        draw();

        expect(screen.getByLabelText('Attempt 3')).toHaveTextContent('3');
    });

    it('offers a retry-now button only while it retries', () => {
        connectionsStore.getState().setConnectionState('alpha', 'open');

        draw();

        expect(screen.queryByRole('button', { name: 'Retry now' })).toBeNull();
    });

    it('retries the connection it names when the retry-now button is pressed', () => {
        connectionsStore.getState().setConnectionState('alpha', 'reconnecting', 1);

        draw();
        fireEvent.click(screen.getByRole('button', { name: 'Retry now' }));

        expect(retryConnectionNow).toHaveBeenCalledWith('alpha');
    });

    it('paints a failure with the error state, never with the accent of a good state', () => {
        connectionsStore.getState().setConnectionState('alpha', 'error');

        draw();

        expect(screen.getByRole('img', { name: 'Error' })).toHaveAttribute('data-state', 'error');
    });

    /** Nobody holds the connection: there is no transport to name, only a quiet socket. */
    it('drops the logo while no connection carries the id asked for', () => {
        draw('ghost');

        expect(screen.getByRole('img', { name: 'Disconnected' })).toBeVisible();
        expect(document.querySelector('[data-part="transport-logo"]')).toBeNull();
    });
});
