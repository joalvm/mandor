import { describe, expect, it } from 'vitest';

import { statusMatches } from '../../../../../../src/renderer/features/requests/lib/compare/compare-status.js';

describe('the status of a comparison (compare-status)', () => {
    it('lets default match any status', () => {
        expect(statusMatches('default', 503)).toBe(true);
    });

    it('lets a family match its codes, whatever the case', () => {
        expect(statusMatches('2XX', 201)).toBe(true);
        expect(statusMatches('2xx', 299)).toBe(true);
        expect(statusMatches('2XX', 404)).toBe(false);
        expect(statusMatches('5XX', 503)).toBe(true);
    });

    it('asks the same code of an exact status', () => {
        expect(statusMatches('201', 201)).toBe(true);
        expect(statusMatches('201', 200)).toBe(false);
        expect(statusMatches('', 200)).toBe(false);
    });
});
