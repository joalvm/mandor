import type { InteropFile } from '@mandor/interop-core';
import type { ErrorCode } from '@mandor/ipc';
import { bridge, fireAndForget } from '@mandor/shell';
import { useEffect, useRef, useState } from 'react';

import type { ImportPick } from '../lib/import-choice.js';
import { readDropped, type DroppedTransfer } from '../lib/read-dropped.js';

/**
 * Bringing the files in, however many they are: a pick is read by main, which says how it goes; a
 * drop is read here. `reading` counts the files while either is under way, and `stop` ends it.
 * Stopped, both answer as nothing picked.
 */
export function useImportReading(fail: (failure: { error: { code: ErrorCode } }) => void): {
    drop: (transfer: DroppedTransfer) => Promise<InteropFile[] | null>;
    pick: (input: ImportPick) => Promise<InteropFile[] | null>;
    reading: number | null;
    stop: () => void;
} {
    const [reading, setReading] = useState<number | null>(null);
    const dropping = useRef<AbortController | null>(null);

    useEffect(
        () =>
            bridge.import.onProgress(({ files }) => {
                setReading(files);
            }),
        [],
    );

    const pick = async (input: ImportPick): Promise<InteropFile[] | null> => {
        const result = await bridge.import.pick({ input });

        setReading(null);

        if (!result.ok) {
            fail(result);

            return null;
        }

        return result.value.files;
    };

    const drop = async (transfer: DroppedTransfer): Promise<InteropFile[] | null> => {
        const controller = new AbortController();

        dropping.current = controller;
        setReading(0);

        try {
            return await readDropped(transfer, {
                signal: controller.signal,
                onRead: setReading,
            });
        } finally {
            setReading(null);
        }
    };

    const stop = (): void => {
        dropping.current?.abort();
        fireAndForget(bridge.import.cancel());
    };

    return { drop, pick, reading, stop };
}
