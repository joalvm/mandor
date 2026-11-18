import { describe, expect, it } from 'vitest';

import { BUNDLE_FORMAT, REPO_FORMAT } from '../../src/index.js';

describe('the formats of the repo and of the bundle', () => {
    it('are positive integers, each of its own', () => {
        expect(Number.isInteger(REPO_FORMAT)).toBe(true);
        expect(REPO_FORMAT).toBeGreaterThan(0);
        expect(Number.isInteger(BUNDLE_FORMAT)).toBe(true);
        expect(BUNDLE_FORMAT).toBeGreaterThan(0);
    });
});
