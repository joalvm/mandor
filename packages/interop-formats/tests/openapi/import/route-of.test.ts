import { describe, expect, it } from 'vitest';

import { routeOf } from '../../../src/openapi/import/route-of.js';

describe('the route a name takes in the workspace', () => {
    it('is the name as an id, with a suffix when another one already has it', () => {
        expect(routeOf('Pet Store', [])).toBe('pet-store');
        expect(routeOf('Pet Store', ['pet-store'])).toBe('pet-store-2');
    });

    it('falls back to a plain word for a name that has nothing an id can keep', () => {
        expect(routeOf('★ ☆', [])).toBe('unnamed');
        expect(routeOf('***', ['unnamed'])).toBe('unnamed-2');
    });
});
