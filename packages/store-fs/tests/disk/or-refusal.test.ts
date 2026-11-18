import { describe, expect, it } from 'vitest';

import { FileReadError } from '../../src/disk/file-read-error.js';
import { orRefusal } from '../../src/disk/or-refusal.js';

function failing(): never {
    throw new Error('bad text');
}

describe('work over a file turned into its refusal (or-refusal)', () => {
    it('hands back what the work gave', () => {
        expect(orRefusal('a.yaml', () => 42)).toBe(42);
    });

    it('refuses with the file it was over when the work throws', () => {
        expect(() => orRefusal('a.yaml', failing)).toThrow(FileReadError);
        expect(() => orRefusal('a.yaml', failing)).toThrow(/a\.yaml.*bad text/u);
    });
});
