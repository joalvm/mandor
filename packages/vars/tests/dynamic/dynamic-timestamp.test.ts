import { afterEach, describe, expect, it, vi } from 'vitest';

import { dynamicTimestamp } from '../../src/dynamic/dynamic-timestamp.js';

afterEach(() => {
    vi.useRealTimers();
});

describe('the timestamp of a dynamic variable', () => {
    it('answers the seconds since the epoch, cut and not rounded', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-02T03:04:05.999Z'));

        expect(dynamicTimestamp()).toBe(String(Date.UTC(2026, 0, 2, 3, 4, 5) / 1000));
    });

    it('answers a whole number of seconds, never milliseconds', () => {
        vi.useFakeTimers();
        vi.setSystemTime(1_700_000_000_123);

        expect(dynamicTimestamp()).toBe('1700000000');
    });
});
