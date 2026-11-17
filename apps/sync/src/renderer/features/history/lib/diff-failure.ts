import type { ErrorCode } from '@mandor/ipc';

import type { EntryState } from '../hooks/useHistoryEntry.js';

/** Why one read gave no send: the code it failed with, or nothing while it stands. */
export function readFailure(read: EntryState): ErrorCode | null {
    if (read.state !== 'failed') {
        return null;
    }

    return read.code;
}

/** Why a comparison cannot be drawn: the code of the first of its two reads that failed. */
export function diffFailure(first: EntryState, second: EntryState): ErrorCode | null {
    return readFailure(first) ?? readFailure(second);
}
