import { describe, expect, it } from 'vitest';

import { formatActivityTime } from '../../../../src/renderer/activity/lib/format-activity-time.js';

describe('the time of a row of the timeline', () => {
    it('reads hours, minutes and seconds', () => {
        expect(formatActivityTime(new Date(2024, 0, 15, 9, 5, 7).getTime())).toBe('09:05:07');
    });

    /** Fixed 24h: an afternoon never turns into a PM that moves the column. */
    it('counts the day in 24 hours', () => {
        expect(formatActivityTime(new Date(2024, 0, 15, 17, 30, 45).getTime())).toBe('17:30:45');
    });
});
