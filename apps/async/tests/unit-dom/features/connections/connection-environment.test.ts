import { success } from '@mandor/ipc';
import type { FakeBridge } from '@mandor/ipc/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { asyncBridge } from '../../../../src/renderer/app/async-bridge.js';
import { connectionsStore } from '../../../../src/renderer/features/connections/connections-store.js';
import { updateConnectionEnvironment } from '../../../../src/renderer/features/connections/lib/update-connection-environment.js';

import { fakeConnection } from './support/fake-connections.js';

const fakeBridge = asyncBridge as FakeBridge;
const SCOPE = { originId: 'local', workspaceId: 'events' };

/** When a spy was called relative to the others, which is what «close, then open» means here. */
function order(spy: { mock: { invocationCallOrder: number[] } }): number {
    return spy.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY;
}

beforeEach(() => {
    vi.restoreAllMocks();
    connectionsStore.getState().reset();
});

describe('the environment selected by a connection', () => {
    it('persists the explicit environment and updates the stored connection', async () => {
        const connection = fakeConnection('alpha', 'Gateway');
        const saved = { ...connection, environmentId: 'staging' };
        const update = vi.spyOn(fakeBridge.connection, 'update').mockResolvedValue(success(saved));

        await updateConnectionEnvironment(SCOPE, connection, 'staging');

        expect(update).toHaveBeenCalledWith({
            ...SCOPE,
            changes: { environmentId: 'staging' },
            connectionId: 'alpha',
        });
        expect(connectionsStore.getState().connections).toContainEqual(saved);
    });

    /**
     * The URL and the headers of the handshake were resolved with the old environment, so a
     * socket that stays up is a socket resolved against what the user just stopped choosing.
     */
    it('reopens a live connection with the environment it just chose', async () => {
        const connection = fakeConnection('alpha', 'Gateway');
        const saved = { ...connection, environmentId: 'staging' };
        const close = vi.spyOn(fakeBridge.ws, 'close');
        const open = vi.spyOn(fakeBridge.ws, 'open');

        vi.spyOn(fakeBridge.connection, 'update').mockResolvedValue(success(saved));
        connectionsStore.getState().upsertConnection(connection);
        connectionsStore.getState().setConnectionState('alpha', 'open');
        await updateConnectionEnvironment(SCOPE, connection, 'staging');

        expect(close).toHaveBeenCalledWith({ connectionId: 'alpha' });
        expect(open).toHaveBeenCalledWith(
            expect.objectContaining({ connectionId: 'alpha', environmentId: 'staging' }),
        );
        expect(order(close)).toBeLessThan(order(open));
    });

    it('opens nothing when the connection was not live', async () => {
        const connection = fakeConnection('alpha', 'Gateway');
        const close = vi.spyOn(fakeBridge.ws, 'close');
        const open = vi.spyOn(fakeBridge.ws, 'open');

        vi.spyOn(fakeBridge.connection, 'update').mockResolvedValue(
            success({ ...connection, environmentId: 'staging' }),
        );
        connectionsStore.getState().upsertConnection(connection);
        await updateConnectionEnvironment(SCOPE, connection, 'staging');

        expect(close).not.toHaveBeenCalled();
        expect(open).not.toHaveBeenCalled();
    });

    it('persists null when the connection stops resolving against any environment', async () => {
        const connection = { ...fakeConnection('alpha', 'Gateway'), environmentId: 'staging' };
        const saved = { ...connection, environmentId: null };
        const update = vi.spyOn(fakeBridge.connection, 'update').mockResolvedValue(success(saved));

        await updateConnectionEnvironment(SCOPE, connection, null);

        expect(update).toHaveBeenCalledWith({
            ...SCOPE,
            changes: { environmentId: null },
            connectionId: 'alpha',
        });
    });
});
