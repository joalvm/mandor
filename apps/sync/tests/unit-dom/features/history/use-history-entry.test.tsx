import { failure, success } from '@mandor/ipc';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { syncBridge } from '../../../../src/renderer/app/sync-bridge.js';
import { useHistoryEntry } from '../../../../src/renderer/features/history/hooks/useHistoryEntry.js';
import { entryOf, ID_A, ID_B } from '../../support/history-fixture.js';
import { flush } from '../../support/flush.js';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('reading the send that is open', () => {
    it('is loading until the disk answers, then the send', async () => {
        vi.spyOn(syncBridge.history, 'read').mockResolvedValue(success(entryOf(ID_A)));

        const { result } = renderHook(() => useHistoryEntry('demo', ID_A));

        expect(result.current).toEqual({ state: 'loading' });

        await flush();

        expect(result.current).toEqual({ entry: entryOf(ID_A), state: 'ready' });
    });

    it('says why when the disk cannot give it', async () => {
        vi.spyOn(syncBridge.history, 'read').mockResolvedValue(failure('fs-read', 'gone'));

        const { result } = renderHook(() => useHistoryEntry('demo', ID_A));

        await flush();

        expect(result.current).toEqual({ code: 'fs-read', state: 'failed' });
    });

    it('reads nothing, and stays loading, while no send is open', () => {
        const read = vi.spyOn(syncBridge.history, 'read');

        const { result } = renderHook(() => useHistoryEntry('demo', null));

        expect(result.current).toEqual({ state: 'loading' });
        expect(read).not.toHaveBeenCalled();
    });

    it('never draws the answer of a row the reader already left', async () => {
        let answerA: (value: ReturnType<typeof success<ReturnType<typeof entryOf>>>) => void = () =>
            undefined;

        vi.spyOn(syncBridge.history, 'read').mockImplementation(({ id }) =>
            id === ID_A
                ? new Promise((resolve) => {
                      answerA = resolve;
                  })
                : Promise.resolve(success(entryOf(ID_B))),
        );

        const { rerender, result } = renderHook(({ id }) => useHistoryEntry('demo', id), {
            initialProps: { id: ID_A },
        });

        rerender({ id: ID_B });
        await flush();
        await act(async () => {
            answerA(success(entryOf(ID_A)));
            await Promise.resolve();
        });

        expect(result.current).toEqual({ entry: entryOf(ID_B), state: 'ready' });
    });
});
