import { ORIGIN_SYNC_STATES } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { syncNoticeOf } from '../src/sync-notice.js';

describe('what the window says of the synchronization (sync-notice)', () => {
    it('says nothing while main has not told', () => {
        expect(syncNoticeOf(null)).toBeNull();
    });

    it.each(ORIGIN_SYNC_STATES)('says it works while a step runs, whatever %s was', (state) => {
        expect(syncNoticeOf({ state, busy: true })).toBe('syncing');
    });

    it('says it failed, and that something clashed, once the step ends', () => {
        expect(syncNoticeOf({ state: 'error', busy: false })).toBe('syncFailed');
        expect(syncNoticeOf({ state: 'conflict', busy: false })).toBe('syncConflict');
    });

    it.each(['local-only', 'clean', 'ahead', 'behind', 'diverged'] as const)(
        'says nothing of %s: the window reads it as ready',
        (state) => {
            expect(syncNoticeOf({ state, busy: false })).toBeNull();
        },
    );
});
