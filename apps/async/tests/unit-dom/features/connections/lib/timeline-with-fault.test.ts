import { describe, expect, it } from 'vitest';

import { timelineWithFault } from '../../../../../src/renderer/features/connections/lib/timeline-with-fault.js';
import { messageEntryOf } from '../../../support/activity-entries.js';

describe('the timeline of a connection with its fault', () => {
    it('is the buffer itself while the connection does not fail', () => {
        const entries = [messageEntryOf({}, 'one')];

        expect(timelineWithFault(entries, undefined)).toBe(entries);
    });

    it('puts the failure after the frames, at the moment it happened', () => {
        const entries = [messageEntryOf({}, 'one')];

        const timeline = timelineWithFault(entries, {
            at: 1_700_000_000_500,
            code: 'ws-open-failed',
        });

        expect(timeline).toHaveLength(2);
        expect(timeline[0]).toBe(entries[0]);
        expect(timeline[1]).toEqual({
            at: 1_700_000_000_500,
            bytes: 0,
            detail: { at: 1_700_000_000_500, code: 'ws-open-failed' },
            id: 'fault-1700000000500',
            kind: 'connection-fault',
        });
    });

    /** The fault is a state that clears: the buffer must not be the one carrying it. */
    it('leaves the buffer untouched', () => {
        const entries = [messageEntryOf({}, 'one')];

        timelineWithFault(entries, { at: 1, code: 'unknown' });

        expect(entries).toHaveLength(1);
    });
});
