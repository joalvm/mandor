import { BODY_WINDOW_BYTES, type ErrorCode } from '@mandor/ipc';
import type { ResponseBody } from '@mandor/schema';
import { fireAndForget } from '@mandor/shell';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { syncBridge } from '../../app/sync-bridge.js';
import { bytesOfEncoded, joinedBytes } from '../lib/body-bytes.js';

type StoredBody = Extract<ResponseBody, { kind: 'stored' }>;

/** What has been read of one body on disk, filed under the reference that names it. */
type Read = { bytes: Uint8Array; error: ErrorCode | null; ref: string };

export type BodyReading = {
    /** What has been read so far; all of it for a body that never left memory. */
    bytes: Uint8Array;
    error: ErrorCode | null;
    /** Reads the next window of a body on disk. With nothing left, or one already coming, it waits. */
    loadMore: () => void;
    /** The size of the whole body, which is more than `bytes` until the last window arrives. */
    total: number;
};

const NO_BYTES = new Uint8Array(0);
const NOTHING_READ: Read = { bytes: NO_BYTES, error: null, ref: '' };

type Outcome = { bytes: Uint8Array } | { error: ErrorCode };

/** One window. A refused answer or one the bridge cannot parse ends as a code, never as a throw. */
async function readWindow(ref: string, offset: number, length: number): Promise<Outcome> {
    try {
        const result = await syncBridge.request.readBody({ length, offset, ref });

        return result.ok ? { bytes: bytesOfEncoded(result.value) } : { error: result.error.code };
    } catch {
        return { error: 'unknown' };
    }
}

/** The read after a window arrived: it grows by the window, or keeps what it had and says why. */
function readAfter(previous: Read, stored: StoredBody, outcome: Outcome): Read {
    const { ref } = stored;
    const base = previous.ref === ref ? previous : { ...NOTHING_READ, ref };

    return 'bytes' in outcome
        ? { bytes: joinedBytes(base.bytes, outcome.bytes, stored.bytes), error: null, ref }
        : { ...base, error: outcome.error };
}

/** The body that went to disk, read a window at a time; one held in memory is not. */
function storedOf(body: ResponseBody | null): StoredBody | null {
    if (body?.kind !== 'stored') {
        return null;
    }

    return body;
}

function inlineBytesOf(body: ResponseBody | null): Uint8Array {
    return body === null || body.kind === 'stored' ? NO_BYTES : bytesOfEncoded(body);
}

/**
 * The bytes of a response body. One that stayed in memory is there whole. One that went to disk
 * is read a window at a time, and never the file at once: the first window comes with the body,
 * the next ones when the viewer asks for them. A body whose reference changes starts over.
 */
export function useBodyWindow(body: ResponseBody | null): BodyReading {
    const stored = storedOf(body);
    const inline = useMemo(() => inlineBytesOf(body), [body]);
    const [read, setRead] = useState<Read>(NOTHING_READ);
    /** The settled cursor advances before React commits, so callbacks cannot reread a window. */
    const settled = useRef<Read>(NOTHING_READ);
    /** Identity distinguishes successive reads, including a reference left and opened again. */
    const reading = useRef<{ ref: string } | null>(null);
    const own = stored !== null && read.ref === stored.ref ? read : NOTHING_READ;

    const loadMore = useCallback(() => {
        if (stored === null || reading.current?.ref === stored.ref) {
            return;
        }

        const offset = settled.current.ref === stored.ref ? settled.current.bytes.length : 0;

        if (offset >= stored.bytes) {
            return;
        }

        const pending = { ref: stored.ref };

        reading.current = pending;
        fireAndForget(
            readWindow(stored.ref, offset, Math.min(BODY_WINDOW_BYTES, stored.bytes - offset)).then(
                (outcome) => {
                    if (reading.current !== pending) {
                        return;
                    }

                    settled.current = readAfter(settled.current, stored, outcome);
                    reading.current = null;
                    setRead(settled.current);
                },
            ),
        );
    }, [stored]);

    useEffect(() => {
        return () => {
            reading.current = null;
        };
    }, [stored?.ref]);

    useEffect(() => {
        if (own.bytes.length === 0 && own.error === null) {
            loadMore();
        }
    }, [loadMore, own]);

    return {
        bytes: stored === null ? inline : own.bytes,
        error: own.error,
        loadMore,
        total: stored === null ? inline.length : stored.bytes,
    };
}
