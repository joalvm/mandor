import { beforeEach, describe, expect, it } from 'vitest';

import { connectionsStore } from '../../../../src/renderer/features/connections/connections-store.js';
import {
    selectAttemptFor,
    selectConnections,
    selectConnectionStateFor,
    selectFaultFor,
    selectRecordingFor,
    selectTransportFor,
} from '../../../../src/renderer/features/connections/selectors.js';

import { fakeConnection } from './support/fake-connections.js';

beforeEach(() => {
    connectionsStore.getState().reset();
});

describe('what the window reads of the connections', () => {
    it('keeps the same empty list between two reads while there is none', () => {
        const first = selectConnections(connectionsStore.getState());
        const second = selectConnections(connectionsStore.getState());

        expect(first).toEqual([]);
        expect(second).toBe(first);
    });

    it('hands out the connections the store holds', () => {
        connectionsStore.getState().upsertConnection(fakeConnection('echo', 'Echo'));

        expect(selectConnections(connectionsStore.getState()).map((each) => each.id)).toEqual([
            'echo',
        ]);
    });

    it('reads a connection nobody dialled as idle', () => {
        expect(selectConnectionStateFor('echo')(connectionsStore.getState())).toBe('idle');
    });

    it('reads the state and the attempt of the connection it names, and no other', () => {
        connectionsStore.getState().setConnectionState('echo', 'reconnecting', 3);

        expect(selectConnectionStateFor('echo')(connectionsStore.getState())).toBe('reconnecting');
        expect(selectAttemptFor('echo')(connectionsStore.getState())).toBe(3);
        expect(selectConnectionStateFor('other')(connectionsStore.getState())).toBe('idle');
        expect(selectAttemptFor('other')(connectionsStore.getState())).toBeUndefined();
    });

    it('reads the fault standing on a connection until it clears', () => {
        expect(selectFaultFor('echo')(connectionsStore.getState())).toBeUndefined();

        connectionsStore.getState().setConnectionError('echo', 'ws-open-failed');

        expect(selectFaultFor('echo')(connectionsStore.getState())?.code).toBe('ws-open-failed');
    });

    it('reads a connection that records nothing as at rest', () => {
        expect(selectRecordingFor('echo')(connectionsStore.getState())).toEqual({
            active: false,
            entries: 0,
        });

        connectionsStore.getState().setRecording('echo', { active: true, entries: 4 });

        expect(selectRecordingFor('echo')(connectionsStore.getState())).toEqual({
            active: true,
            entries: 4,
        });
    });

    it('reads the transport of a connection held, and nothing for one that is not', () => {
        connectionsStore.getState().upsertConnection(fakeConnection('echo', 'Echo'));

        expect(selectTransportFor('echo')(connectionsStore.getState())).toBe('websocket');
        expect(selectTransportFor('gone')(connectionsStore.getState())).toBeUndefined();
    });
});
