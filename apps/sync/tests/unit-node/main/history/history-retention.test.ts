import { resolvePreferenceValues } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { DEFAULT_PRUNE_LIMITS } from '../../../../src/main/history/history-limits.js';
import { createHistoryRetention } from '../../../../src/main/history/history-retention.js';

describe('how much of the past the history keeps', () => {
    /** Main prunes before the window has spoken: it must keep what the settings show. */
    it('keeps what the settings start at until the window says', () => {
        const settings = resolvePreferenceValues({ app: {} });

        expect(createHistoryRetention().limits()).toEqual(DEFAULT_PRUNE_LIMITS);
        expect(String(DEFAULT_PRUNE_LIMITS.maxEntries)).toBe(settings['history.maxEntries']);
        expect(String(DEFAULT_PRUNE_LIMITS.maxAgeDays)).toBe(settings['history.maxAgeDays']);
    });

    it('keeps the count and the age chosen, and the weight of the bodies as it was', () => {
        const retention = createHistoryRetention();

        retention.choose({ maxEntries: 100, maxAgeDays: 7 });

        expect(retention.limits()).toEqual({
            maxEntries: 100,
            maxAgeDays: 7,
            maxBodyBytes: DEFAULT_PRUNE_LIMITS.maxBodyBytes,
        });
    });
});
