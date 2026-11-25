import { failure } from '@mandor/ipc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { asyncBridge } from '../../../../../src/renderer/app/async-bridge.js';
import { connectionsStore } from '../../../../../src/renderer/features/connections/index.js';
import { openSocket } from '../../../../../src/renderer/features/connections/lib/open-socket.js';

import { fakeConnection } from '../support/fake-connections.js';

const SCOPE = { workspaceId: 'events' };
const SCRIPTS = { onBeforeConnect: { source: 'mandor.variables.set("t", "1");' } };

beforeEach(() => {
    vi.restoreAllMocks();
    connectionsStore.getState().reset();
});

afterEach(() => {
    connectionsStore.getState().reset();
});

describe('asking main to open a socket', () => {
    it('hands main the scripts of the connection, as they are now', async () => {
        const open = vi.spyOn(asyncBridge.ws, 'open');

        await openSocket({ ...fakeConnection('alpha', 'Gateway'), scripts: SCRIPTS }, SCOPE);

        expect(open.mock.calls[0]?.[0]).toMatchObject({ connectionId: 'alpha', scripts: SCRIPTS });
    });

    it('dials past the scripts only when the open says so', async () => {
        const open = vi.spyOn(asyncBridge.ws, 'open');
        const connection = { ...fakeConnection('alpha', 'Gateway'), scripts: SCRIPTS };

        await openSocket(connection, SCOPE, { skipScripts: true });
        await openSocket(connection, SCOPE);

        expect(open.mock.calls[0]?.[0]).toMatchObject({ scripts: SCRIPTS, skipScripts: true });
        expect(open.mock.calls[1]?.[0]).not.toHaveProperty('skipScripts');
    });

    it('sends no scripts when the connection has none', async () => {
        const open = vi.spyOn(asyncBridge.ws, 'open');

        await openSocket(fakeConnection('alpha', 'Gateway'), SCOPE);

        expect(open.mock.calls[0]?.[0]).not.toHaveProperty('scripts');
    });

    /** The person closed it or opened it again while its script ran: nothing failed. */
    it('says no and paints no failure when the open was cancelled', async () => {
        vi.spyOn(asyncBridge.ws, 'open').mockResolvedValue(
            failure('ws-open-cancelled', 'cancelled'),
        );

        await expect(openSocket(fakeConnection('alpha', 'Gateway'), SCOPE)).resolves.toBe(false);
        expect(connectionsStore.getState().faults['alpha']).toBeUndefined();
    });

    it('paints the failure of a script that kept the socket from opening', async () => {
        vi.spyOn(asyncBridge.ws, 'open').mockResolvedValue(
            failure('script-failed', 'connection alpha: boom'),
        );

        await expect(openSocket(fakeConnection('alpha', 'Gateway'), SCOPE)).resolves.toBe(false);
        expect(connectionsStore.getState().faults['alpha']).toMatchObject({
            code: 'script-failed',
            message: 'connection alpha: boom',
        });
    });
});
