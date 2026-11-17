import { failure, success } from '@mandor/ipc';
import { bridge } from '@mandor/shell';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTokenStatus } from '../src/hooks/useTokenStatus.js';

const REQUEST = { workspaceId: 'payments', environmentId: 'staging', parentPath: null };
const VALID = { state: 'valid', expiresAt: '2026-10-01T14:32:00.000Z' } as const;

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe('useTokenStatus', () => {
    it('asks for the state of the token once the level stops changing', async () => {
        const status = vi.spyOn(bridge.auth, 'tokenStatus').mockResolvedValue(success(VALID));
        const { result } = renderHook(() => useTokenStatus(REQUEST, vi.fn()));

        expect(result.current.status.state).toBe('none');

        await act(() => vi.advanceTimersByTimeAsync(300));

        expect(status).toHaveBeenCalledWith(REQUEST);
        expect(result.current.status).toEqual(VALID);
    });

    it('asks again when the level changes, and only for the last one', async () => {
        const status = vi.spyOn(bridge.auth, 'tokenStatus').mockResolvedValue(success(VALID));
        const { rerender } = renderHook(
            ({ id }) => useTokenStatus({ ...REQUEST, environmentId: id }, vi.fn()),
            {
                initialProps: { id: 'a' },
            },
        );

        rerender({ id: 'b' });
        rerender({ id: 'c' });
        await act(() => vi.advanceTimersByTimeAsync(300));

        expect(status).toHaveBeenCalledTimes(1);
        expect(status).toHaveBeenCalledWith({ ...REQUEST, environmentId: 'c' });
    });

    it('fetches a token, is busy meanwhile, and shows the new state', async () => {
        let finish: (value: ReturnType<typeof success<typeof VALID>>) => void = () => undefined;

        vi.spyOn(bridge.auth, 'tokenStatus').mockResolvedValue(
            success({ state: 'none', expiresAt: null }),
        );
        vi.spyOn(bridge.auth, 'tokenFetch').mockReturnValue(
            new Promise((resolve) => {
                finish = resolve;
            }),
        );

        const { result } = renderHook(() => useTokenStatus(REQUEST, vi.fn()));

        act(() => {
            result.current.fetch();
        });

        expect(result.current.busy).toBe(true);

        await act(async () => {
            finish(success(VALID));
            await vi.advanceTimersByTimeAsync(0);
        });

        expect(result.current.busy).toBe(false);
        expect(result.current.status).toEqual(VALID);
    });

    it('hands the code of a refusal over and keeps the state it had', async () => {
        const onError = vi.fn();

        vi.spyOn(bridge.auth, 'tokenStatus').mockResolvedValue(success(VALID));
        vi.spyOn(bridge.auth, 'tokenFetch').mockResolvedValue(failure('auth-cancelled', 'stopped'));

        const { result } = renderHook(() => useTokenStatus(REQUEST, onError));

        await act(() => vi.advanceTimersByTimeAsync(300));
        await act(async () => {
            result.current.fetch();
            await vi.advanceTimersByTimeAsync(0);
        });

        expect(onError).toHaveBeenCalledWith('auth-cancelled');
        expect(result.current.busy).toBe(false);
        expect(result.current.status).toEqual(VALID);
    });

    it('forgets the token and goes back to none', async () => {
        const forget = vi.spyOn(bridge.auth, 'tokenForget').mockResolvedValue(success({}));

        vi.spyOn(bridge.auth, 'tokenStatus').mockResolvedValue(success(VALID));

        const { result } = renderHook(() => useTokenStatus(REQUEST, vi.fn()));

        await act(() => vi.advanceTimersByTimeAsync(300));
        await act(async () => {
            result.current.forget();
            await vi.advanceTimersByTimeAsync(0);
        });

        expect(forget).toHaveBeenCalledWith(REQUEST);
        expect(result.current.status).toEqual({ state: 'none', expiresAt: null });
    });
});
