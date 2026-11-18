import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { bodiesDir, bodyFile } from '../../src/body/body-path.js';

const HASH = 'ab'.repeat(32);

describe('where the bodies of responses live', () => {
    it('keeps them under .mandor, which never goes to git', () => {
        expect(bodiesDir('/repo')).toBe(join('/repo', '.mandor', 'bodies'));
    });

    it('names a file by the hash of its bytes', () => {
        expect(bodyFile('/repo', HASH)).toBe(join('/repo', '.mandor', 'bodies', HASH));
    });

    it.each(['', 'abc', '../x', `${HASH}0`, HASH.toUpperCase(), `${HASH.slice(1)}g`])(
        'refuses `%s`, which is not a sha-256 in hex',
        (hash) => {
            expect(() => bodyFile('/repo', hash)).toThrow();
        },
    );
});
