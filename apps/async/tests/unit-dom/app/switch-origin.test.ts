import { EMPTY_UI_SESSION, success } from '@mandor/ipc';
import { createLocalOrigin, createOrigin, type Connection } from '@mandor/schema';
import { selectTabs, shellStore } from '@mandor/shell';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { activityStore } from '../../../src/renderer/activity/activity-store.js';
import { selectActivityFor } from '../../../src/renderer/activity/select-activity-for.js';
import { asyncBridge } from '../../../src/renderer/app/async-bridge.js';
import { connectionsStore } from '../../../src/renderer/features/connections/index.js';

// The orchestration is of the repos package and reaches main through the same window bridge
// this file spies on, so nothing of it is doubled here: what is asserted is the order.

const ECHO_RESOURCE = 'mandor://local/payments/connection/echo';

const LOCAL = createLocalOrigin('Local');
const TEAM = createOrigin({
    id: 'equipo',
    name: 'Equipo',
    url: 'https://github.com/equipo/api.git',
});

const events: string[] = [];
let releasedAtSwitch = false;

function connection(id: string): Connection {
    return {
        id,
        name: id,
        transport: 'websocket',
        url: `wss://example.test/${id}`,
        headers: [],
        environmentId: null,
    };
}

function seedLiveConnection(): void {
    connectionsStore.getState().setConnections([connection('echo')]);
    connectionsStore.getState().setConnectionState('echo', 'open');
    activityStore.getState().appendActivity(ECHO_RESOURCE, [
        {
            at: 1,
            bytes: 4,
            detail: { direction: 'in', data: 'hola', at: 1, environmentId: null },
            kind: 'connection-message',
        },
    ]);
}

beforeEach(async () => {
    activityStore.getState().reset();
    connectionsStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([LOCAL, TEAM]);

    vi.spyOn(window.mandor.session, 'save').mockImplementation(() => {
        events.push('session.save');

        return Promise.resolve(success({}));
    });
    vi.spyOn(window.mandor.session, 'load').mockImplementation(() => {
        events.push('session.load');

        return Promise.resolve(success(EMPTY_UI_SESSION));
    });
    vi.spyOn(window.mandor.origin, 'switch').mockImplementation(() => {
        events.push('origin.switch');
        releasedAtSwitch =
            shellStore.getState().activeOriginId === null &&
            Object.keys(connectionsStore.getState().states).length === 0;

        return Promise.resolve(success({ repo: null, workspaces: [] }));
    });
    vi.spyOn(asyncBridge.ws, 'close').mockImplementation(() => {
        events.push('ws.close');

        return Promise.resolve(success({}));
    });

    await shellStore.getState().loadSession(LOCAL.id);
    events.length = 0;
    releasedAtSwitch = false;
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('switching origin', () => {
    it('closes the sockets, saves the session, releases the state and only then opens the other origin', async () => {
        const { switchAsyncOriginTo } = await import('../../../src/renderer/app/switch-origin.js');

        seedLiveConnection();
        await switchAsyncOriginTo(TEAM.id);

        expect(events).toEqual(['ws.close', 'session.save', 'origin.switch', 'session.load']);
        expect(asyncBridge.ws.close).toHaveBeenCalledWith({ connectionId: 'echo' });
        expect(releasedAtSwitch).toBe(true);
        expect(shellStore.getState().activeOriginId).toBe(TEAM.id);
    });

    /** Between two attempts there is no socket, but there is a timer that would dial one. */
    it('closes a connection waiting to retry, so it never dials from the other origin', async () => {
        const { switchAsyncOriginTo } = await import('../../../src/renderer/app/switch-origin.js');

        seedLiveConnection();
        connectionsStore.getState().setConnectionState('echo', 'reconnecting');
        await switchAsyncOriginTo(TEAM.id);

        expect(asyncBridge.ws.close).toHaveBeenCalledWith({ connectionId: 'echo' });
    });

    it('goes back to where it was if the other origin refuses to open', async () => {
        const { switchAsyncOriginTo } = await import('../../../src/renderer/app/switch-origin.js');

        vi.spyOn(window.mandor.origin, 'switch').mockImplementation(() => {
            events.push('origin.switch');

            return Promise.resolve({
                ok: false,
                error: { code: 'origin-unreachable', message: 'no contesta' },
            });
        });

        await switchAsyncOriginTo(TEAM.id);

        expect(shellStore.getState().activeOriginId).toBe(LOCAL.id);
        expect(events).toEqual(['session.save', 'origin.switch', 'session.load']);
    });

    it('leaves subscriptions, tabs and buffers where they started after ten round trips', async () => {
        const { switchAsyncOriginTo } = await import('../../../src/renderer/app/switch-origin.js');

        const onState = vi.spyOn(asyncBridge.ws, 'onState');
        const onActivity = vi.spyOn(asyncBridge.ws, 'onActivity');

        seedLiveConnection();

        for (let round = 0; round < 10; round += 1) {
            await switchAsyncOriginTo(TEAM.id);
            await switchAsyncOriginTo(LOCAL.id);
        }

        expect(shellStore.getState().activeOriginId).toBe(LOCAL.id);
        expect(selectTabs(shellStore.getState()).map((tab) => tab.id)).toEqual([]);
        expect(connectionsStore.getState().connections).toEqual([]);
        expect(connectionsStore.getState().states).toEqual({});
        expect(selectActivityFor(ECHO_RESOURCE)(activityStore.getState())).toEqual([]);
        expect(connectionsStore.getState().faults).toEqual({});
        expect(onState).not.toHaveBeenCalled();
        expect(onActivity).not.toHaveBeenCalled();
    });
});
