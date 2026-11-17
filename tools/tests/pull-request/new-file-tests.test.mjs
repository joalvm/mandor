import { describe, expect, it } from 'vitest';

import { newFileTestProblems } from '../../pull-request/new-file-tests.mjs';

describe('a source file that a request adds', () => {
    it('is asked for a test of its own', () => {
        const problems = newFileTestProblems(['packages/host/src/menu/whistle-menu.ts']);

        expect(problems[0]).toMatch('New file, new test');
    });

    it('passes when a test of its package already names it', () => {
        expect(newFileTestProblems(['packages/host/src/window/window-size.ts'])).toEqual([]);
    });

    // The name is what a test names, not the folder: `packages/ui` groups its tests by theme, so
    // the one that exercises `SplitPane` is called `structure.test.tsx` and still covers it.
    it('accepts a test that lives under another name', () => {
        expect(newFileTestProblems(['packages/ui/src/components/SplitPane.tsx'])).toEqual([]);
    });

    // `tests/` mirrors `src/`, and a package's tests import through its barrel, so nothing inside
    // them spells the module out: the name of the test file is the whole of the link.
    it('accepts a test named after the file, though its imports go through the barrel', () => {
        expect(newFileTestProblems(['packages/workspace/src/WorkspacesTabKind.tsx'])).toEqual([]);
    });

    it('leaves barrels, declarations and test helpers alone', () => {
        const added = [
            'packages/ui/src/index.ts',
            'packages/ui/src/env.d.ts',
            'packages/shell/src/testing/whistle.ts',
        ];

        expect(newFileTestProblems(added)).toEqual([]);
    });

    it('says nothing about what the request did not add', () => {
        const added = ['docs/plans/README.md', 'tools/guards/check-guards.mjs', 'README.md'];

        expect(newFileTestProblems(added)).toEqual([]);
    });
});
