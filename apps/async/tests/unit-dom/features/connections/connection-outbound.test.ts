import { envStore } from '@mandor/env';
import { failure } from '@mandor/ipc';
import { shellStore } from '@mandor/shell';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { asyncBridge } from '../../../../src/renderer/app/async-bridge.js';
import { connectionsStore } from '../../../../src/renderer/features/connections/index.js';
import { connectionOutbound } from '../../../../src/renderer/features/connections/lib/connection-outbound.js';

import { fakeConnection } from './support/fake-connections.js';

const FRAME = { origin: 'Pedido creado', itemPath: null, template: '{ "id": "{{pedidoId}}" }' };

beforeEach(() => {
    vi.restoreAllMocks();
    connectionsStore.getState().reset();
    connectionsStore
        .getState()
        .setConnections([
            fakeConnection('alpha', 'Gateway'),
            { ...fakeConnection('beta', 'Billing'), environmentId: 'staging' },
        ]);
    envStore.getState().reset();
    envStore.setState({ activeEnvironmentIds: { events: 'local' } });
    shellStore.getState().reset();
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
});

afterEach(() => {
    connectionsStore.getState().reset();
    envStore.getState().reset();
    shellStore.getState().reset();
});

describe('the connections of this app as somewhere a frame can go', () => {
    /** Whoever wrote the frame reads the top of the list first, and what is up goes there. */
    it('lists the workspace with the live connections first', () => {
        connectionsStore.getState().setConnectionState('beta', 'open');

        expect(
            connectionOutbound()
                .targets()
                .map((target) => target.name),
        ).toEqual(['Billing', 'Gateway']);
    });

    /** The one that chose none resolves against none, whatever the workspace has active. */
    it('says of each one the environment it will resolve against', () => {
        expect(connectionOutbound().targets()).toEqual([
            { environmentId: null, id: 'alpha', live: false, name: 'Gateway' },
            { environmentId: 'staging', id: 'beta', live: false, name: 'Billing' },
        ]);
    });

    it('hands a live connection the template and the item it came from', async () => {
        const open = vi.spyOn(asyncBridge.ws, 'open');
        const send = vi.spyOn(asyncBridge.ws, 'send');

        connectionsStore.getState().setConnectionState('alpha', 'open');
        await connectionOutbound().send('alpha', FRAME);

        expect(open).not.toHaveBeenCalled();
        expect(send).toHaveBeenCalledWith({
            connectionId: 'alpha',
            origin: 'Pedido creado',
            itemPath: null,
            template: '{ "id": "{{pedidoId}}" }',
            workspaceId: 'events',
        });
    });

    it('hands the template of the websocket to the send, and nothing for a Socket.IO', async () => {
        const send = vi.spyOn(asyncBridge.ws, 'send');

        connectionsStore.getState().setConnections([
            {
                ...fakeConnection('alpha', 'Gateway'),
                websocket: { frame: '{"event": {{event}}, "data": {{payload}}}' },
            },
            { ...fakeConnection('beta', 'Talk'), transport: 'socketio' },
        ]);
        connectionsStore.getState().setConnectionState('alpha', 'open');
        connectionsStore.getState().setConnectionState('beta', 'open');

        await connectionOutbound().send('alpha', FRAME);

        expect(send).toHaveBeenCalledWith(
            expect.objectContaining({ frame: '{"event": {{event}}, "data": {{payload}}}' }),
        );

        await connectionOutbound().send('beta', FRAME);

        expect('frame' in (send.mock.calls[1]?.[0] as object)).toBe(false);
    });

    /** Choosing a connection that is down is choosing to open it: the send follows the socket. */
    it('opens a connection that is down before sending through it', async () => {
        const open = vi.spyOn(asyncBridge.ws, 'open');
        const send = vi.spyOn(asyncBridge.ws, 'send');

        await connectionOutbound().send('beta', FRAME);

        expect(open).toHaveBeenCalledWith(
            expect.objectContaining({ connectionId: 'beta', environmentId: 'staging' }),
        );
        expect(send).toHaveBeenCalledWith(expect.objectContaining({ connectionId: 'beta' }));
    });

    it('sends nothing when the socket refused to come up', async () => {
        const send = vi.spyOn(asyncBridge.ws, 'send');

        vi.spyOn(asyncBridge.ws, 'open').mockResolvedValue(failure('ws-open-failed', 'refused'));
        await connectionOutbound().send('beta', FRAME);

        expect(send).not.toHaveBeenCalled();
        expect(connectionsStore.getState().faults['beta']?.code).toBe('ws-open-failed');
    });

    it('sends nothing through a connection this workspace does not have', async () => {
        const send = vi.spyOn(asyncBridge.ws, 'send');

        await connectionOutbound().send('gamma', FRAME);

        expect(send).not.toHaveBeenCalled();
    });
});
