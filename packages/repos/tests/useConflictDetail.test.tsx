import { failure, success } from '@mandor/ipc';
import type { FakeBridge } from '@mandor/ipc/testing';
import { bridge } from '@mandor/shell';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useConflictDetail } from '../src/hooks/useConflictDetail.js';
import { REQUEST_CLASH } from './support/conflict-fixtures.js';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('reading the clash a tab was opened on (useConflictDetail)', () => {
    it('reads the clash by its id and holds it', async () => {
        const read = vi.spyOn(bridge.conflict, 'read').mockResolvedValue(success(REQUEST_CLASH));
        const { result } = renderHook(() => useConflictDetail(REQUEST_CLASH.id));

        expect(result.current).toEqual({ state: 'loading' });

        await waitFor(() => {
            expect(result.current).toEqual({ detail: REQUEST_CLASH, state: 'ready' });
        });
        expect(read).toHaveBeenCalledWith({ id: REQUEST_CLASH.id });
    });

    it('turns into «gone» when main has no such clash', async () => {
        vi.spyOn(bridge.conflict, 'read').mockResolvedValue(failure('unknown', 'gone'));
        const { result } = renderHook(() => useConflictDetail(REQUEST_CLASH.id));

        await waitFor(() => {
            expect(result.current).toEqual({ state: 'gone' });
        });
    });

    it('reads again when main says the clashes changed, and the clash may be gone by then', async () => {
        vi.spyOn(bridge.conflict, 'read')
            .mockResolvedValueOnce(success(REQUEST_CLASH))
            .mockResolvedValueOnce(failure('unknown', 'gone'));
        const { result } = renderHook(() => useConflictDetail(REQUEST_CLASH.id));

        await waitFor(() => {
            expect(result.current.state).toBe('ready');
        });
        act(() => {
            (bridge as FakeBridge).emitConflictChanged({});
        });
        await waitFor(() => {
            expect(result.current.state).toBe('gone');
        });
    });

    it('reads as loading the clash it is moved to, not the one it held', async () => {
        // The second read never lands: what shows meanwhile is what the test looks at.
        vi.spyOn(bridge.conflict, 'read')
            .mockResolvedValueOnce(success(REQUEST_CLASH))
            .mockReturnValueOnce(new Promise(() => undefined));

        const { rerender, result } = renderHook(({ id }) => useConflictDetail(id), {
            initialProps: { id: REQUEST_CLASH.id },
        });

        await waitFor(() => {
            expect(result.current.state).toBe('ready');
        });

        rerender({ id: 'another-clash' });

        expect(result.current).toEqual({ state: 'loading' });
    });

    it('lets go of the push when the tab goes, and ignores an answer that comes late', async () => {
        let late: (value: ReturnType<typeof success<typeof REQUEST_CLASH>>) => void = () =>
            undefined;

        vi.spyOn(bridge.conflict, 'read').mockReturnValue(
            new Promise((resolve) => {
                late = resolve;
            }),
        );

        const { result, unmount } = renderHook(() => useConflictDetail(REQUEST_CLASH.id));

        unmount();
        late(success(REQUEST_CLASH));
        await Promise.resolve();

        expect(result.current).toEqual({ state: 'loading' });
    });
});
