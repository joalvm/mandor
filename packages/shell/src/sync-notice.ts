import type { OriginSyncState } from '@mandor/schema';

/**
 * What the window says of the synchronization of the open origin, when it has anything to say:
 * it works, it failed, or something clashed. Everything else is `null` and reads as ready. The
 * word is the reader's and never says why — the cause is of main and of its log.
 */
export type SyncNotice = 'syncing' | 'syncFailed' | 'syncConflict';

/** What each state says once nothing is running: only a failure and a clash have a word. */
const NOTICE_OF_STATE: Readonly<Record<OriginSyncState['state'], SyncNotice | null>> = {
    ahead: null,
    behind: null,
    clean: null,
    conflict: 'syncConflict',
    diverged: null,
    error: 'syncFailed',
    'local-only': null,
};

/** The word the window has for the synchronization of the open origin, or none. */
export function syncNoticeOf(state: OriginSyncState | null): SyncNotice | null {
    if (state === null) {
        return null;
    }

    if (state.busy) {
        return 'syncing';
    }

    return NOTICE_OF_STATE[state.state];
}
