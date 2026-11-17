import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ConnectionStatusDot } from '../../../../src/renderer/features/connections/components/tab/ConnectionStatusDot.js';
import { ConnectionTransportMark } from '../../../../src/renderer/features/connections/components/tab/ConnectionTransportMark.js';
import { connectionsStore } from '../../../../src/renderer/features/connections/connections-store.js';

import { AppProviders } from '../../support/app-providers.js';
import { fakeConnection } from './support/fake-connections.js';

beforeEach(() => {
    connectionsStore.getState().reset();
    connectionsStore.getState().upsertConnection(fakeConnection('alpha', 'Gateway'));
});

afterEach(() => {
    cleanup();
    connectionsStore.getState().reset();
});

/**
 * A tab says the connection twice, and each half stands on its own side: what it dials with
 * opens the tab, and how the socket is closes it. Neither half draws the other, or the two
 * could never be put in two places.
 */
describe('what opens a connection tab', () => {
    it('is the logo of the transport, and nothing about the socket', () => {
        connectionsStore.getState().setConnectionState('alpha', 'open');

        render(<ConnectionTransportMark connectionId="alpha" />, { wrapper: AppProviders });

        expect(document.querySelector('[data-part="websocket-logo"]')).not.toBeNull();
        expect(screen.queryByRole('img', { name: 'Connected' })).toBeNull();
    });

    it('draws nothing while no connection carries the id asked for', () => {
        render(<ConnectionTransportMark connectionId="ghost" />, { wrapper: AppProviders });

        expect(document.querySelector('[data-part="transport-logo"]')).toBeNull();
    });
});

describe('what closes a connection tab', () => {
    it('is the state of the socket, and nothing about the transport', () => {
        connectionsStore.getState().setConnectionState('alpha', 'open');

        render(<ConnectionStatusDot connectionId="alpha" />, { wrapper: AppProviders });

        expect(screen.getByRole('img', { name: 'Connected' })).toHaveAttribute(
            'data-state',
            'connected',
        );
        expect(document.querySelector('[data-part="transport-logo"]')).toBeNull();
    });

    it('reads a socket nobody opened as one that is down', () => {
        render(<ConnectionStatusDot connectionId="ghost" />, { wrapper: AppProviders });

        expect(screen.getByRole('img', { name: 'Disconnected' })).toBeVisible();
    });
});
