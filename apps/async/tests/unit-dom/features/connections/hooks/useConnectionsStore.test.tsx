import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { connectionsStore } from '../../../../../src/renderer/features/connections/connections-store.js';
import { useConnectionsStore } from '../../../../../src/renderer/features/connections/hooks/useConnectionsStore.js';

afterEach(() => {
    cleanup();
    connectionsStore.getState().reset();
});

describe('reading the connections of the window', () => {
    it('answers what the selector asks of the store', () => {
        connectionsStore.getState().setConnectionState('echo', 'open');

        const { result } = renderHook(() => useConnectionsStore((state) => state.states['echo']));

        expect(result.current).toBe('open');
    });

    it('follows the store when a connection changes', () => {
        const { result } = renderHook(() => useConnectionsStore((state) => state.states['echo']));

        expect(result.current).toBeUndefined();

        act(() => {
            connectionsStore.getState().setConnectionState('echo', 'connecting');
        });

        expect(result.current).toBe('connecting');
    });
});
