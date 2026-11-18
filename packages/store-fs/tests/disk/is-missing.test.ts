import { describe, expect, it } from 'vitest';

import { isMissing } from '../../src/disk/is-missing.js';

function failureOf(code: string): Error {
    return Object.assign(new Error(code), { code });
}

describe('telling a missing path from a real failure', () => {
    it('says yes when nothing is at the path', () => {
        expect(isMissing(failureOf('ENOENT'))).toBe(true);
    });

    it('says no to a refused permission or a file where a folder should be', () => {
        expect(isMissing(failureOf('EACCES'))).toBe(false);
        expect(isMissing(failureOf('ENOTDIR'))).toBe(false);
    });

    it('says no to anything that is not an error of the disk', () => {
        expect(isMissing(new Error('broken'))).toBe(false);
        expect(isMissing('ENOENT')).toBe(false);
    });
});
