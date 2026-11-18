import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { activityStore } from '../../../../../src/renderer/activity/activity-store.js';
import { connectionsStore } from '../../../../../src/renderer/features/connections/connections-store.js';
import { useConnectionPanelState } from '../../../../../src/renderer/features/connections/hooks/useConnectionPanelState.js';

import { fakeConnection } from '../support/fake-connections.js';

const RESOURCE = 'mandor://demo/events/connection/echo';

function reset(): void {
    connectionsStore.getState().reset();
    activityStore.getState().reset();
}

beforeEach(reset);

afterEach(() => {
    cleanup();
    reset();
});

describe('what a connection panel reads of the window', () => {
    it('finds the connection, at rest and with an empty timeline, before anything arrives', () => {
        connectionsStore.getState().upsertConnection(fakeConnection('echo', 'Echo'));

        const { result } = renderHook(() => useConnectionPanelState('echo', RESOURCE));

        expect(result.current.connection?.name).toBe('Echo');
        expect(result.current.wsState).toBe('idle');
        expect(result.current.fault).toBeUndefined();
        expect(result.current.timeline).toEqual([]);
    });

    it('finds no connection that the workspace does not hold', () => {
        const { result } = renderHook(() => useConnectionPanelState('gone', RESOURCE));

        expect(result.current.connection).toBeUndefined();
    });

    it('follows the state of the socket', () => {
        const { result } = renderHook(() => useConnectionPanelState('echo', RESOURCE));

        act(() => {
            connectionsStore.getState().setConnectionState('echo', 'open');
        });

        expect(result.current.wsState).toBe('open');
    });

    it('puts the standing fault at the end of the frames that arrived', () => {
        const { result } = renderHook(() => useConnectionPanelState('echo', RESOURCE));

        act(() => {
            activityStore.getState().appendActivity(RESOURCE, [
                {
                    at: 1,
                    bytes: 4,
                    detail: { at: 1, data: 'hola', direction: 'in', environmentId: null },
                    kind: 'connection-message',
                },
            ]);
            connectionsStore.getState().setConnectionError('echo', 'ws-open-failed');
        });

        expect(result.current.entries).toHaveLength(1);
        expect(result.current.timeline.map((entry) => entry.kind)).toEqual([
            'connection-message',
            'connection-fault',
        ]);
        expect(result.current.fault?.code).toBe('ws-open-failed');
    });

    it('reads the timeline of its own resource and no other', () => {
        const { result } = renderHook(() => useConnectionPanelState('echo', RESOURCE));

        act(() => {
            activityStore.getState().appendActivity('mandor://demo/events/connection/other', [
                {
                    at: 1,
                    bytes: 0,
                    detail: { at: 1, code: 'unknown' },
                    kind: 'connection-fault',
                },
            ]);
        });

        expect(result.current.entries).toEqual([]);
    });
});
