import { globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { testGlobs } from '../workspace/test-globs.mjs';

/** Every file under a folder of tests: what the runners pick up, and what they might be missing. */
const UNDER_TESTS = [
    'packages/*/tests/**/*.{js,mjs,mts,ts,tsx}',
    'apps/*/tests/**/*.{js,mjs,mts,ts,tsx}',
    'tools/tests/**/*.{js,mjs,mts,ts}',
];

const RUNNERS = /** @type {const} */ (['node', 'dom', 'e2e', 'types']);

/**
 * @typedef {'node' | 'dom' | 'e2e' | 'types' | null} Runner
 * @typedef {{ path: string; text: string; runner: Runner }} TestFile
 */

function matched(root, patterns) {
    return new Set(globSync(patterns, { cwd: root }).map((file) => file.replaceAll('\\', '/')));
}

/**
 * Every file under the tests of a package, an app or the tools, with the runner that picks it up:
 * `null` for a file no runner reads, which is a helper or a test that never runs.
 *
 * @param {string} root
 * @returns {TestFile[]}
 */
export function testFiles(root) {
    const globs = testGlobs(root);
    const picked = RUNNERS.map((runner) => ({ runner, files: matched(root, globs[runner]) }));

    return [...matched(root, UNDER_TESTS)].sort().map((path) => ({
        path,
        runner: picked.find((each) => each.files.has(path))?.runner ?? null,
        text: readFileSync(join(root, path), 'utf8'),
    }));
}
