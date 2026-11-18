import * as electron from 'electron';
import { describe, expect, it } from 'vitest';

describe('the desktop runtime in the node tests', () => {
    /**
     * The installed package is the path to a binary only an install with scripts downloads: a
     * test that loaded it would pass where that install ran and fail where it did not.
     */
    it('is absent, so no test needs the binary an install may not have downloaded', () => {
        expect(Object.keys(electron)).toEqual([]);
    });
});
