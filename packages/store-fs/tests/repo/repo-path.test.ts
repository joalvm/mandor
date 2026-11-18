import { isAbsolute, join, relative, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { mandorDir, repoFile } from '../../src/index.js';
import { workspacesDir } from '../../src/repo/repo-path.js';

const root = resolve('mandor-repo');

/** A path escapes the root as soon as walking back to it needs `..` or an absolute jump. */
function isInside(target: string): boolean {
    const step = relative(root, target);

    return step !== '' && !step.startsWith('..') && !isAbsolute(step);
}

describe('repo paths', () => {
    it('puts the repo file at the root', () => {
        expect(repoFile(root)).toBe(join(root, 'mandor.yaml'));
    });

    it('puts the private directory at the root', () => {
        expect(mandorDir(root)).toBe(join(root, '.mandor'));
    });

    it('puts the workspaces container at the root', () => {
        expect(workspacesDir(root)).toBe(join(root, 'workspaces'));
    });

    /** Every path this file hands out stays under the root the caller owns. */
    it.each([repoFile, mandorDir, workspacesDir])('keeps %o inside the root', (build) => {
        expect(isInside(build(root))).toBe(true);
    });
});
