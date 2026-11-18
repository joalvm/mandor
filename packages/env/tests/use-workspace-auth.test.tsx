import { success, failure } from '@mandor/ipc';
import { bridge } from '@mandor/shell';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useWorkspaceAuth } from '../src/hooks/useWorkspaceAuth.js';

const AFTER_DEBOUNCE = 400;

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    // The window goes first: resetting state under a mounted tree is an update outside act.
    cleanup();

    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe('useWorkspaceAuth', () => {
    it('reads the auth of the workspace through the bridge', async () => {
        vi.spyOn(bridge.auth, 'read').mockResolvedValue(success({ auth: { type: 'none' } }));

        const { result } = renderHook(() => useWorkspaceAuth('payments'));

        await act(() => vi.advanceTimersByTimeAsync(0));

        expect(bridge.auth.read).toHaveBeenCalledWith({
            workspaceId: 'payments',
        });
        expect(result.current.auth).toEqual({ type: 'none' });
    });

    it('writes once the typing stops, and only the last value', async () => {
        const write = vi.spyOn(bridge.auth, 'write').mockResolvedValue(success({}));
        const { result } = renderHook(() => useWorkspaceAuth('payments'));

        await act(() => vi.advanceTimersByTimeAsync(0));

        act(() => {
            result.current.setAuth({ type: 'basic', username: 'u', password: 'p' }, vi.fn());
        });
        act(() => {
            result.current.setAuth({ type: 'none' }, vi.fn());
        });

        await act(() => vi.advanceTimersByTimeAsync(AFTER_DEBOUNCE));

        expect(write).toHaveBeenCalledTimes(1);
        expect(write).toHaveBeenCalledWith({
            workspaceId: 'payments',
            auth: { type: 'none' },
        });
    });

    /** Closing the dialog right after the last keystroke must not be what loses the write. */
    it('writes the last value even when the dialog closes inside the pause', async () => {
        const write = vi.spyOn(bridge.auth, 'write').mockResolvedValue(success({}));
        const { result, unmount } = renderHook(() => useWorkspaceAuth('payments'));

        await act(() => vi.advanceTimersByTimeAsync(0));

        act(() => {
            result.current.setAuth({ type: 'none' }, vi.fn());
        });
        unmount();
        await vi.advanceTimersByTimeAsync(AFTER_DEBOUNCE);

        expect(write).toHaveBeenCalledWith({
            workspaceId: 'payments',
            auth: { type: 'none' },
        });
    });

    it('shows nothing of the last workspace while the next one is read', async () => {
        // The second read never lands: what shows meanwhile is what the test looks at.
        vi.spyOn(bridge.auth, 'read')
            .mockResolvedValueOnce(success({ auth: { type: 'none' } }))
            .mockReturnValueOnce(new Promise(() => undefined));

        const { rerender, result } = renderHook(({ id }) => useWorkspaceAuth(id), {
            initialProps: { id: 'payments' },
        });

        await act(() => vi.advanceTimersByTimeAsync(0));

        expect(result.current.auth).toEqual({ type: 'none' });

        rerender({ id: 'billing' });

        expect(result.current.auth).toBeNull();
    });

    it('puts the value on disk back when the write is refused', async () => {
        vi.spyOn(bridge.auth, 'read').mockResolvedValue(success({ auth: { type: 'none' } }));
        vi.spyOn(bridge.auth, 'write').mockResolvedValue(failure('fs-write', 'no'));

        const onError = vi.fn();
        const { result } = renderHook(() => useWorkspaceAuth('payments'));

        await act(() => vi.advanceTimersByTimeAsync(0));

        act(() => {
            result.current.setAuth({ type: 'basic', username: 'u', password: 'p' }, onError);
        });

        await act(() => vi.advanceTimersByTimeAsync(AFTER_DEBOUNCE));

        expect(result.current.auth).toEqual({ type: 'none' });
        expect(onError).toHaveBeenCalledWith('fs-write');
    });
});
