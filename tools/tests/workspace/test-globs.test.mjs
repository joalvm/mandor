import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { testGlobs } from '../../workspace/test-globs.mjs';

let root = '';

async function aPackage(dir, manifest) {
    await mkdir(join(root, 'packages', dir), { recursive: true });
    await writeFile(join(root, 'packages', dir, 'package.json'), JSON.stringify(manifest));
}

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-test-globs-'));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('where each runner looks for tests (testGlobs)', () => {
    /** A `.test.tsx` in a package that does not draw has no window to run in: no runner reads it. */
    it('reads only `.test.ts` in node, and both extensions in the packages that draw', async () => {
        await aPackage('schema', { name: '@mandor/schema' });
        await aPackage('host', { name: '@mandor/host', dependencies: { electron: '1.0.0' } });
        await aPackage('ui', { name: '@mandor/ui', dependencies: { react: '19.0.0' } });

        const globs = testGlobs(root);

        expect(globs.node).toEqual([
            'apps/*/tests/unit-node/**/*.test.ts',
            'packages/host/tests/**/*.test.ts',
            'packages/schema/tests/**/*.test.ts',
            'tools/tests/**/*.test.mjs',
        ]);
        expect(globs.dom).toEqual([
            'apps/*/tests/unit-dom/**/*.test.{ts,tsx}',
            'packages/ui/tests/**/*.test.{ts,tsx}',
        ]);
        expect(globs.e2e).toEqual(['apps/*/tests/e2e/**/*.{spec,test}.{ts,tsx}']);
    });

    /** Only a pure package's own tests may contribute to its coverage gate. */
    it('partitions node tests into the measured core and the uninstrumented runtime', async () => {
        await aPackage('future', { name: '@mandor/future' });
        await aPackage('host', { name: '@mandor/host', dependencies: { electron: '1.0.0' } });
        await aPackage('ui', { name: '@mandor/ui', dependencies: { react: '19.0.0' } });

        const globs = testGlobs(root);

        expect(globs.nodeCore).toEqual(['packages/future/tests/**/*.test.ts']);
        expect(globs.nodeRuntime).toEqual([
            'apps/*/tests/unit-node/**/*.test.ts',
            'packages/host/tests/**/*.test.ts',
            'tools/tests/**/*.test.mjs',
        ]);
        expect([...globs.nodeCore, ...globs.nodeRuntime].sort()).toEqual([...globs.node].sort());
        expect(new Set([...globs.nodeCore, ...globs.nodeRuntime]).size).toBe(globs.node.length);
    });

    /** The compiler reads every `tests` folder, whatever the layer of the package. */
    it('reads type tests in every package and app, whatever runs the rest', async () => {
        await aPackage('schema', { name: '@mandor/schema' });

        expect(testGlobs(root).types).toEqual([
            'packages/*/tests/**/*.test-d.{ts,tsx}',
            'apps/*/tests/**/*.test-d.{ts,tsx}',
        ]);
    });
});
