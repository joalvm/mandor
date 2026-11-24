import { failure, success, type ImportProgressPush } from '@mandor/ipc';
import { bridge } from '@mandor/shell';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useImportReading } from '../../src/import/hooks/useImportReading.js';
import type { DroppedTransfer } from '../../src/import/lib/read-dropped.js';

import { AppProviders } from '../support/providers.js';

function reading(fail = vi.fn()) {
    return renderHook(() => useImportReading(fail), { wrapper: AppProviders }).result;
}

/** A drop as the browser gives it, of the files it lists and no entries. */
function dropOf(files: File[]): DroppedTransfer {
    return { files, items: [] };
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('bringing the files of an import in (useImportReading)', () => {
    it('counts what main says it has read, until the pick answers', async () => {
        let push: (progress: ImportProgressPush) => void = () => undefined;

        vi.spyOn(bridge.import, 'onProgress').mockImplementation((handler) => {
            push = handler;

            return () => undefined;
        });

        const files = [{ path: 'a.json', text: '{}' }];
        const result = reading();

        act(() => {
            push({ files: 50 });
        });

        expect(result.current.reading).toBe(50);

        vi.spyOn(bridge.import, 'pick').mockResolvedValue(success({ files }));

        await act(async () => {
            await expect(result.current.pick('files')).resolves.toEqual(files);
        });

        expect(result.current.reading).toBeNull();
    });

    it('answers nothing, and says why, when main cannot read the pick', async () => {
        const fail = vi.fn();
        const refused = failure('unknown', 'no');

        vi.spyOn(bridge.import, 'pick').mockResolvedValue(refused);

        const result = reading(fail);

        await act(async () => {
            await expect(result.current.pick('files')).resolves.toBeNull();
        });

        expect(fail).toHaveBeenCalledWith(refused);
    });

    it('reads a drop here, and is done when it ends', async () => {
        const result = reading();

        await act(async () => {
            await expect(
                result.current.drop(dropOf([new File(['{}'], 'a.json')])),
            ).resolves.toEqual([{ path: 'a.json', text: '{}' }]);
        });

        expect(result.current.reading).toBeNull();
    });

    it('stops a drop and asks main to stop too', async () => {
        const cancel = vi.spyOn(bridge.import, 'cancel');
        const result = reading();
        let dropped: Promise<unknown> = Promise.resolve();

        act(() => {
            dropped = result.current.drop(dropOf([new File(['{}'], 'a.json')]));
            result.current.stop();
        });

        await act(async () => {
            await expect(dropped).resolves.toBeNull();
        });

        expect(cancel).toHaveBeenCalledOnce();
        await waitFor(() => {
            expect(result.current.reading).toBeNull();
        });
    });
});
