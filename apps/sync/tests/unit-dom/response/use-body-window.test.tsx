import { BODY_WINDOW_BYTES, failure, success } from '@mandor/ipc';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { syncBridge } from '../../../src/renderer/app/sync-bridge.js';
import { useBodyWindow } from '../../../src/renderer/response/hooks/useBodyWindow.js';

const REF = 'a'.repeat(64);
const OTHER = 'b'.repeat(64);
const TOTAL = BODY_WINDOW_BYTES * 2 + 100;

function stored(ref: string) {
    return { bytes: TOTAL, contentType: 'text/plain', kind: 'stored', ref } as const;
}

/** A window of `x` of the length that was asked for, as main answers a text file. */
function windowOf(length: number) {
    return success({ encoding: 'utf8' as const, text: 'x'.repeat(length), total: TOTAL });
}

describe('the bytes of a response body', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('has a body that stayed in memory whole, and asks main for nothing', () => {
        const read = vi.spyOn(syncBridge.request, 'readBody');
        const body = { encoding: 'utf8', kind: 'inline', text: 'hola' } as const;

        const { result } = renderHook(() => useBodyWindow(body));

        expect(Array.from(result.current.bytes)).toEqual([104, 111, 108, 97]);
        expect(result.current.total).toBe(4);

        act(() => {
            result.current.loadMore();
        });

        expect(read).not.toHaveBeenCalled();
    });

    it('has nothing when the response had no body', () => {
        const { result } = renderHook(() => useBodyWindow(null));

        expect(result.current.bytes.length).toBe(0);
        expect(result.current.total).toBe(0);
    });

    it('reads the first window of a body on disk and never the file at once', async () => {
        const read = vi
            .spyOn(syncBridge.request, 'readBody')
            .mockResolvedValue(windowOf(BODY_WINDOW_BYTES));

        const { result } = renderHook(() => useBodyWindow(stored(REF)));

        await waitFor(() => {
            expect(result.current.bytes.length).toBe(BODY_WINDOW_BYTES);
        });

        expect(read).toHaveBeenCalledTimes(1);
        expect(read).toHaveBeenCalledWith({ length: BODY_WINDOW_BYTES, offset: 0, ref: REF });
        expect(result.current.total).toBe(TOTAL);
    });

    it('reads the next window after the ones already read, the last one as short as what is left', async () => {
        const read = vi
            .spyOn(syncBridge.request, 'readBody')
            .mockImplementation((input) => Promise.resolve(windowOf(input.length)));
        const { result } = renderHook(() => useBodyWindow(stored(REF)));

        await waitFor(() => {
            expect(result.current.bytes.length).toBe(BODY_WINDOW_BYTES);
        });
        act(() => {
            result.current.loadMore();
        });
        await waitFor(() => {
            expect(result.current.bytes.length).toBe(BODY_WINDOW_BYTES * 2);
        });
        act(() => {
            result.current.loadMore();
        });
        await waitFor(() => {
            expect(result.current.bytes.length).toBe(TOTAL);
        });

        expect(read).toHaveBeenLastCalledWith({
            length: 100,
            offset: BODY_WINDOW_BYTES * 2,
            ref: REF,
        });
    });

    it('asks for nothing once the whole body was read', async () => {
        const read = vi
            .spyOn(syncBridge.request, 'readBody')
            .mockImplementation((input) => Promise.resolve(windowOf(input.length)));
        const { result } = renderHook(() => useBodyWindow(stored(REF)));

        for (let window = 1; window <= 3; window += 1) {
            await waitFor(() => {
                expect(result.current.bytes.length).toBe(
                    Math.min(BODY_WINDOW_BYTES * window, TOTAL),
                );
            });
            act(() => {
                result.current.loadMore();
            });
        }

        expect(read).toHaveBeenCalledTimes(3);
    });

    it('says why a window did not come and keeps what it had', async () => {
        vi.spyOn(syncBridge.request, 'readBody')
            .mockResolvedValueOnce(windowOf(BODY_WINDOW_BYTES))
            .mockResolvedValueOnce(failure('fs-read', 'gone'));
        const { result } = renderHook(() => useBodyWindow(stored(REF)));

        await waitFor(() => {
            expect(result.current.bytes.length).toBe(BODY_WINDOW_BYTES);
        });
        act(() => {
            result.current.loadMore();
        });
        await waitFor(() => {
            expect(result.current.error).toBe('fs-read');
        });

        expect(result.current.bytes.length).toBe(BODY_WINDOW_BYTES);
    });

    it('ends in an unknown failure when the bridge refuses to answer', async () => {
        vi.spyOn(syncBridge.request, 'readBody').mockRejectedValue(new Error('bad answer'));

        const { result } = renderHook(() => useBodyWindow(stored(REF)));

        await waitFor(() => {
            expect(result.current.error).toBe('unknown');
        });
    });

    it('starts over when the reference changes', async () => {
        const read = vi
            .spyOn(syncBridge.request, 'readBody')
            .mockResolvedValue(windowOf(BODY_WINDOW_BYTES));
        const { rerender, result } = renderHook(({ ref }) => useBodyWindow(stored(ref)), {
            initialProps: { ref: REF },
        });

        await waitFor(() => {
            expect(result.current.bytes.length).toBe(BODY_WINDOW_BYTES);
        });
        rerender({ ref: OTHER });

        expect(result.current.bytes.length).toBe(0);

        await waitFor(() => {
            expect(read).toHaveBeenLastCalledWith({
                length: BODY_WINDOW_BYTES,
                offset: 0,
                ref: OTHER,
            });
        });
    });
});
