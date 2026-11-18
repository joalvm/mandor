import { describe, expect, it } from 'vitest';

import { BUNDLE_FORMAT } from '../../src/bundle/bundle-format.js';

describe('BUNDLE_FORMAT', () => {
    it('is the version a bundle of this build writes', () => {
        expect(BUNDLE_FORMAT).toBe(2);
    });
});
