import type { Connection } from '@mandor/schema';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    createConnectionsStore,
    selectConnectionStateFor,
    selectConnections,
    selectFaultFor,
    selectOpenedAtFor,
    selectRecordingFor,
} from '../../../../src/renderer/features/connections/index.js';

function connection(id: string): Connection {
    return {
        id,
        name: `Connection ${id}`,
        transport: 'websocket',
        url: 'wss://example.test/socket',
        headers: [],
        environmentId: null,
    };
}

describe('the connections store', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('keeps the list by name when one is added or renamed', () => {
        const store = createConnectionsStore();

        store.getState().upsertConnection({ ...connection('a'), name: 'Zeta' });
        store.getState().upsertConnection({ ...connection('b'), name: 'Beta' });
        store.getState().upsertConnection({ ...connection('a'), name: 'Alfa' });

        expect(store.getState().connections.map((entry) => entry.name)).toEqual(['Alfa', 'Beta']);
    });

    it('restores the exact initial state on reset', () => {
        const store = createConnectionsStore();

        store.getState().upsertConnection(connection('alpha'));
        store.getState().setActiveConnection('alpha');
        store.getState().setConnectionState('alpha', 'open');
        store.getState().setConnectionError('alpha', 'ws-open-failed');
        store.getState().reset();

        const state = store.getState();

        expect({
            connections: state.connections,
            states: state.states,
            faults: state.faults,
            activeConnectionId: state.activeConnectionId,
        }).toEqual({
            connections: [],
            states: {},
            faults: {},
            activeConnectionId: null,
        });
    });

    it('defaults the state of a connection to idle until main pushes one', () => {
        const store = createConnectionsStore();

        expect(selectConnectionStateFor('alpha')(store.getState())).toBe('idle');

        store.getState().setConnectionState('alpha', 'open');

        expect(selectConnectionStateFor('alpha')(store.getState())).toBe('open');
    });

    /** The time a connection has been connected counts from the push that opened it. */
    it('stamps the moment the socket opened and keeps it while it stays open', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-08-24T10:00:00.000Z'));

        const store = createConnectionsStore();

        store.getState().setConnectionState('alpha', 'connecting');

        expect(selectOpenedAtFor('alpha')(store.getState())).toBeUndefined();

        store.getState().setConnectionState('alpha', 'open');
        vi.setSystemTime(new Date('2026-08-24T10:00:05.000Z'));
        store.getState().setConnectionState('alpha', 'open');

        expect(selectOpenedAtFor('alpha')(store.getState())).toBe(
            Date.parse('2026-08-24T10:00:00.000Z'),
        );
    });

    it('forgets the moment once the socket is anything but open', () => {
        const store = createConnectionsStore();

        store.getState().setConnectionState('alpha', 'open');
        store.getState().setConnectionState('alpha', 'reconnecting');

        expect(selectOpenedAtFor('alpha')(store.getState())).toBeUndefined();
    });

    it('replaces a connection that already exists and adds one that does not', () => {
        const store = createConnectionsStore();

        store.getState().upsertConnection(connection('alpha'));
        store.getState().upsertConnection({ ...connection('alpha'), name: 'Renamed' });
        store.getState().upsertConnection(connection('beta'));

        const connections = selectConnections(store.getState());

        expect(connections.map((entry) => entry.id)).toEqual(['beta', 'alpha']);
        expect(connections[1]?.name).toBe('Renamed');
    });

    it('replaces the whole connection list on setConnections', () => {
        const store = createConnectionsStore();

        store.getState().upsertConnection(connection('alpha'));
        store.getState().setConnections([connection('beta'), connection('gamma')]);

        expect(selectConnections(store.getState()).map((entry) => entry.id)).toEqual([
            'beta',
            'gamma',
        ]);
    });

    it('stamps the failure of a connection with its moment and clears it on null', () => {
        const store = createConnectionsStore();

        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-08-24T10:00:00.000Z'));
        store.getState().setConnectionError('alpha', 'ws-open-failed');

        expect(selectFaultFor('alpha')(store.getState())).toEqual({
            at: Date.parse('2026-08-24T10:00:00.000Z'),
            code: 'ws-open-failed',
        });

        store.getState().setConnectionError('alpha', null);

        expect(selectFaultFor('alpha')(store.getState())).toBeUndefined();
    });

    it('keeps what the transport said with the failure, and a new word is a new failure', () => {
        const store = createConnectionsStore();

        store.getState().setConnectionError('alpha', 'ws-open-failed', 'ECONNREFUSED');
        const first = selectFaultFor('alpha')(store.getState());

        store.getState().setConnectionError('alpha', 'ws-open-failed', 'ECONNREFUSED');

        expect(selectFaultFor('alpha')(store.getState())).toBe(first);
        expect(first?.message).toBe('ECONNREFUSED');

        store.getState().setConnectionError('alpha', 'ws-open-failed', 'ENOTFOUND');

        expect(selectFaultFor('alpha')(store.getState())?.message).toBe('ENOTFOUND');
    });
});

describe('the recordings of the connections store', () => {
    it('keeps the state of each recording under its connection', () => {
        const store = createConnectionsStore();

        store.getState().setRecording('alpha', { active: true, entries: 7 });

        expect(selectRecordingFor('alpha')(store.getState())).toEqual({
            active: true,
            entries: 7,
        });
        expect(selectRecordingFor('beta')(store.getState())).toEqual({
            active: false,
            entries: 0,
        });
    });

    /** Two quiet connections answer with one resting reference: no batch redraws another. */
    it('answers with the same resting state for every connection that records none', () => {
        const store = createConnectionsStore();

        expect(selectRecordingFor('alpha')(store.getState())).toBe(
            selectRecordingFor('beta')(store.getState()),
        );
    });

    it('forgets every recording when the window changes what it is looking at', () => {
        const store = createConnectionsStore();

        store.getState().setRecording('alpha', { active: true, entries: 7 });
        store.getState().reset();

        expect(selectRecordingFor('alpha')(store.getState())).toEqual({
            active: false,
            entries: 0,
        });
    });
});
