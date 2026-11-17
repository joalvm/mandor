import { success } from '@mandor/ipc';
import type { FakeBridge } from '@mandor/ipc/testing';
import { bridge, shellStore } from '@mandor/shell';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useOriginSyncState } from '../src/hooks/useOriginSyncState.js';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    shellStore.getState().reset();
});

function open(originId: string | null): void {
    act(() => {
        shellStore.setState({ activeOriginId: originId });
    });
}

describe('the state of the synchronization the window keeps (useOriginSyncState)', () => {
    it('asks main where the origin stands once one is open', async () => {
        vi.spyOn(bridge.origin, 'state').mockResolvedValue(
            success({ state: 'conflict', busy: false }),
        );
        renderHook(() => {
            useOriginSyncState();
        });

        open('team');

        await waitFor(() => {
            expect(shellStore.getState().syncState).toEqual({ state: 'conflict', busy: false });
        });
    });

    it('follows what main pushes after', () => {
        renderHook(() => {
            useOriginSyncState();
        });
        open('team');

        act(() => {
            (bridge as FakeBridge).emitOriginState({ state: 'clean', busy: true });
        });

        expect(shellStore.getState().syncState).toEqual({ state: 'clean', busy: true });
    });

    it('lets a push that came first beat an answer that came after', async () => {
        let answer: (state: { state: 'error'; busy: false }) => void = () => undefined;

        vi.spyOn(bridge.origin, 'state').mockReturnValue(
            new Promise((resolve) => {
                answer = (state) => {
                    resolve(success(state));
                };
            }),
        );
        renderHook(() => {
            useOriginSyncState();
        });
        open('team');
        act(() => {
            (bridge as FakeBridge).emitOriginState({ state: 'clean', busy: false });
        });
        await act(async () => {
            answer({ state: 'error', busy: false });
            await Promise.resolve();
        });

        expect(shellStore.getState().syncState).toEqual({ state: 'clean', busy: false });
    });

    it('listens to nothing while no origin is open, and stops when the window goes', () => {
        const { unmount } = renderHook(() => {
            useOriginSyncState();
        });

        act(() => {
            (bridge as FakeBridge).emitOriginState({ state: 'clean', busy: true });
        });

        expect(shellStore.getState().syncState).toBeNull();

        open('team');
        unmount();
        act(() => {
            (bridge as FakeBridge).emitOriginState({ state: 'error', busy: false });
        });

        expect(shellStore.getState().syncState).not.toEqual({ state: 'error', busy: false });
    });
});
