import { describe, expect, it } from 'vitest';

import { formatActivityTime } from '../../../../src/renderer/activity/lib/format-activity-time.js';

describe('the time of a row of the timeline', () => {
    it('reads hours, minutes and seconds', () => {
        expect(formatActivityTime(new Date(2024, 0, 15, 9, 5, 7).getTime(), 'en')).toBe('09:05:07');
    });

    /** Fixed 24h: an afternoon never turns into a PM that moves the column. */
    it('counts the day in 24 hours', () => {
        expect(formatActivityTime(new Date(2024, 0, 15, 17, 30, 45).getTime(), 'en')).toBe(
            '17:30:45',
        );
    });

    it('writes the time the way the language of the window does', () => {
        const at = new Date(2024, 0, 15, 17, 30, 45).getTime();

        expect(formatActivityTime(at, 'es')).toBe('17:30:45');
        expect(formatActivityTime(at, 'ar')).toMatch(
            /^[0-9\u0660-\u0669]{2}:[0-9\u0660-\u0669]{2}:/,
        );
    });
});
