import { BODY_WINDOW_BYTES, success } from '@mandor/ipc';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { syncBridge } from '../../../src/renderer/app/sync-bridge.js';
import { useBodyWindow } from '../../../src/renderer/response/hooks/useBodyWindow.js';

const TOTAL = BODY_WINDOW_BYTES * 2;
const REF = 'a'.repeat(64);

function page(offset: number) {
    return success({
        encoding: 'utf8' as const,
        text: (offset === 0 ? 'a' : 'b').repeat(BODY_WINDOW_BYTES),
        total: TOTAL,
    });
}

function stored(ref: string) {
    return { bytes: TOTAL, contentType: 'text/plain', kind: 'stored', ref } as const;
}

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

it('reads distinct bytes when a second request lands before React commits the first window', async () => {
    const first = Promise.withResolvers<ReturnType<typeof page>>();
    const offsets: number[] = [];

    vi.spyOn(syncBridge.request, 'readBody').mockImplementation((input) => {
        offsets.push(input.offset);

        return offsets.length === 1 ? first.promise : Promise.resolve(page(input.offset));
    });
    const { result } = renderHook(() => useBodyWindow(stored(REF)));

    await act(async () => {
        first.resolve(page(0));
        await first.promise;
        await Promise.resolve();
        expect(result.current.bytes.length).toBe(0);
        result.current.loadMore();
    });
    act(() => {
        result.current.loadMore();
    });
    await waitFor(() => {
        expect(result.current.bytes.length).toBe(TOTAL);
    });

    expect(result.current.bytes[BODY_WINDOW_BYTES - 1]).toBe('a'.charCodeAt(0));
    expect(result.current.bytes[BODY_WINDOW_BYTES]).toBe('b'.charCodeAt(0));
    expect(offsets).toEqual([0, BODY_WINDOW_BYTES]);
});

it('ignores a superseded read even when the same reference returns', async () => {
    const first = Promise.withResolvers<ReturnType<typeof page>>();

    vi.spyOn(syncBridge.request, 'readBody')
        .mockReturnValueOnce(first.promise)
        .mockResolvedValue(page(BODY_WINDOW_BYTES));
    const { rerender, result } = renderHook(({ ref }) => useBodyWindow(stored(ref)), {
        initialProps: { ref: REF },
    });

    rerender({ ref: 'b'.repeat(64) });
    rerender({ ref: REF });
    await waitFor(() => {
        expect(result.current.bytes.length).toBe(BODY_WINDOW_BYTES);
    });
    await act(async () => {
        first.resolve(page(0));
        await first.promise;
    });

    expect(result.current.bytes.length).toBe(BODY_WINDOW_BYTES);
    expect(result.current.bytes[0]).toBe('b'.charCodeAt(0));
});
