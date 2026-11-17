import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { isolatedTests } from '../../workspace/isolated-tests.mjs';

let root = '';

async function aTest(path, text) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), text);
}

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-isolated-'));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('the tests that cannot share the modules of a worker (isolatedTests)', () => {
    it('names the files that replace a module, with forward slashes and in order', async () => {
        await aTest('packages/host/tests/b.test.ts', "vi.mock('electron', () => ({}));");
        await aTest('packages/host/tests/a/a.test.ts', "vi.doMock('node:fs', () => ({}));");
        await aTest('packages/host/tests/plain.test.ts', "import { it } from 'vitest';");

        expect(isolatedTests(root, ['packages/*/tests/**/*.test.ts'])).toEqual([
            'packages/host/tests/a/a.test.ts',
            'packages/host/tests/b.test.ts',
        ]);
    });

    it('names the files that throw the module graph away', async () => {
        await aTest('packages/ui/tests/fresh.test.ts', 'beforeEach(() => { vi.resetModules(); });');

        expect(isolatedTests(root, ['packages/*/tests/**/*.test.ts'])).toEqual([
            'packages/ui/tests/fresh.test.ts',
        ]);
    });

    /** A module that keeps state of its own is tested from its first load, in a window of its own. */
    it('names the files that give a reason to run alone', async () => {
        await aTest(
            'packages/ui/tests/runtime.test.ts',
            '// isolation-policy: the runtime loads once per window\n',
        );
        await aTest('packages/ui/tests/empty.test.ts', '// isolation-policy:\n');

        expect(isolatedTests(root, ['packages/*/tests/**/*.test.ts'])).toEqual([
            'packages/ui/tests/runtime.test.ts',
        ]);
    });

    it('leaves out a mention of the words that is not a call', async () => {
        await aTest(
            'tools/tests/rule.test.mjs',
            "const banned = 'vi.mock';\n// see vi.resetModules\n",
        );

        expect(isolatedTests(root, ['tools/tests/**/*.test.mjs'])).toEqual([]);
    });
});
