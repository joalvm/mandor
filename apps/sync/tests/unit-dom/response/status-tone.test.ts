import { describe, expect, it } from 'vitest';

import { statusFamilyOf } from '../../../src/renderer/response/lib/format-response.js';
import { STATUS_TONE } from '../../../src/renderer/response/lib/status-tone.js';

describe('the colour of a status', () => {
    it.each([
        [200, 'text-text-success'],
        [301, 'text-text-info'],
        [404, 'text-text-error'],
        [503, 'text-text-error'],
        [101, 'text-text-secondary'],
    ])('gives a %i the tone %s', (status, tone) => {
        expect(STATUS_TONE[statusFamilyOf(status)]).toBe(tone);
    });
});
