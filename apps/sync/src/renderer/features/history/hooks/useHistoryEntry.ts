import type { ErrorCode } from '@mandor/ipc';
import type { HistoryEntry } from '@mandor/schema';
import { fireAndForget } from '@mandor/shell';
import { useEffect, useState } from 'react';

import { fetchHistoryEntry } from '../lib/fetch-history-entry.js';

export type EntryState =
    | { state: 'failed'; code: ErrorCode }
    | { state: 'loading' }
    | { entry: HistoryEntry; state: 'ready' };

const LOADING: EntryState = { state: 'loading' };

/** What is read, filed under the send it was read for, so a stale answer never shows as new. */
type Read = { id: string; result: EntryState };

/**
 * One send read from disk, again whenever the id changes. The answer of a read that no longer
 * matters — the reader moved to another row before it came — is dropped instead of drawn.
 */
export function useHistoryEntry(workspaceId: string, id: string | null): EntryState {
    const [read, setRead] = useState<Read | null>(null);

    useEffect(() => {
        if (id === null) {
            return undefined;
        }

        let current = true;

        fireAndForget(
            fetchHistoryEntry(workspaceId, id).then((answer) => {
                if (current) {
                    setRead({
                        id,
                        result: answer.ok
                            ? { entry: answer.entry, state: 'ready' }
                            : { code: answer.code, state: 'failed' },
                    });
                }
            }),
        );

        return () => {
            current = false;
        };
    }, [workspaceId, id]);

    return read !== null && read.id === id ? read.result : LOADING;
}
