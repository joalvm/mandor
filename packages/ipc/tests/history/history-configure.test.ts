import { describe, expect, it } from 'vitest';

import { historyConfigureRequestSchema } from '../../src/index.js';

describe('the request of history:configure', () => {
    it('takes how many sends and how many days the history keeps', () => {
        const input = { maxEntries: 1000, maxAgeDays: 90 };

        expect(historyConfigureRequestSchema.parse(input)).toEqual(input);
    });

    it('refuses a limit that keeps nothing, or part of a send', () => {
        expect(
            historyConfigureRequestSchema.safeParse({ maxEntries: 0, maxAgeDays: 30 }).success,
        ).toBe(false);
        expect(
            historyConfigureRequestSchema.safeParse({ maxEntries: 500, maxAgeDays: 1.5 }).success,
        ).toBe(false);
    });

    it('refuses what it does not describe', () => {
        expect(
            historyConfigureRequestSchema.safeParse({ maxEntries: 500, maxAgeDays: 30, x: 1 })
                .success,
        ).toBe(false);
    });
});
