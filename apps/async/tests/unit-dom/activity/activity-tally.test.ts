import { describe, expect, it } from 'vitest';

import type { ActivityEntry } from '../../../src/renderer/activity/activity-entry.js';
import { tallyOf } from '../../../src/renderer/activity/activity-tally.js';
import { faultEntryOf, messageEntryOf, scriptEntryOf } from '../support/activity-entries.js';

function frame(id: string, direction: 'in' | 'out', bytes: number): ActivityEntry {
    return { ...messageEntryOf({ at: 0, data: '', direction }, id), bytes };
}

function fault(id: string, bytes: number): ActivityEntry {
    return { ...faultEntryOf('ws-open-failed', 0), bytes, id };
}

describe('the foot of a timeline', () => {
    it('counts each direction apart and weighs it', () => {
        const tally = tallyOf([frame('a', 'in', 10), frame('b', 'in', 5), frame('c', 'out', 3)]);

        expect(tally.inbound).toEqual({ bytes: 15, count: 2 });
        expect(tally.outbound).toEqual({ bytes: 3, count: 1 });
    });

    it('leaves an entry that crossed no wire out of both halves', () => {
        const tally = tallyOf([
            frame('a', 'in', 10),
            fault('b', 99),
            { ...scriptEntryOf(), bytes: 50 },
        ]);

        expect(tally.inbound).toEqual({ bytes: 10, count: 1 });
        expect(tally.outbound).toEqual({ bytes: 0, count: 0 });
    });
});
