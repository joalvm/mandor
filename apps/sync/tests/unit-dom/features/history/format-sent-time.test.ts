import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    formatSentDay,
    formatSentTime,
} from '../../../../src/renderer/features/history/lib/format-sent-time.js';

afterEach(() => {
    vi.useRealTimers();
});

describe('the time of a send', () => {
    it('reads as an hour in the language of the window', () => {
        expect(formatSentTime('2026-09-02T10:30:00.000Z', 'en')).toMatch(/\d{1,2}:30/);
    });

    it('heads a day with its weekday and month, and no year while it is this one', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-10-01T12:00:00.000Z'));

        const text = formatSentDay('2026-09-02T12:00:00.000Z', 'en');

        expect(text).toContain('Wednesday');
        expect(text).toContain('September');
        expect(text).not.toContain('2026');
    });

    it('adds the year when the day is of another one', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-10-01T12:00:00.000Z'));

        expect(formatSentDay('2025-09-02T12:00:00.000Z', 'es')).toContain('2025');
    });
});
