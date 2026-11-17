import { describe, expect, it } from 'vitest';

import { relativeTime } from '../../../src/components/notice-center/relative-time.js';

const NOW = 1_700_000_000_000;

describe('relativeTime', () => {
    it('says now for what just happened, in the language asked', () => {
        expect(relativeTime(NOW - 10_000, NOW, 'es')).toBe('ahora');
        expect(relativeTime(NOW, NOW, 'en')).toBe('now');
    });

    it.each([
        [5 * 60_000, 'hace 5 minutos'],
        [3 * 3_600_000, 'hace 3 horas'],
        [2 * 86_400_000, 'anteayer'],
    ])('picks the grain of a glance for %d ms', (elapsed, text) => {
        expect(relativeTime(NOW - elapsed, NOW, 'es')).toBe(text);
    });

    it('never says a notice comes from the future', () => {
        expect(relativeTime(NOW + 60_000, NOW, 'en')).toBe('now');
    });
});
