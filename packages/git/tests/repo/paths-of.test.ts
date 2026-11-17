import { describe, expect, it } from 'vitest';

import { pathsOf } from '../../src/repo/paths-of.js';

describe('the paths of a listing of git (paths-of)', () => {
    it('splits on the NUL byte and drops the empty tail', () => {
        expect(pathsOf('a.yaml\0b/c.yaml\0')).toEqual(['a.yaml', 'b/c.yaml']);
    });

    it('writes every path with forward slashes', () => {
        expect(pathsOf('workspaces\\shop\\get.yaml\0')).toEqual(['workspaces/shop/get.yaml']);
    });

    it('is empty for an empty listing', () => {
        expect(pathsOf('')).toEqual([]);
    });
});
