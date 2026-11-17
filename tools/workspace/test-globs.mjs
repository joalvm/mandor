import { workspacePackages } from './workspace-packages.mjs';

/**
 * Where each runner looks for tests. A file outside these globs never runs, whatever it says,
 * and a green run does not tell: the config of the runner and the guard of the test files read
 * the same lists, so the two cannot drift apart.
 *
 * Pure packages and the platform run in node and the packages that draw with react in jsdom: the
 * split is by package, read from its manifest, so a test cannot land in the wrong environment by
 * accident and a new package cannot land in none.
 *
 * Type tests run nowhere: the compiler reads them, since every package and app compiles its
 * `tests` folder, and a runtime assertion in one would never be evaluated.
 *
 * @param {string} root
 * @returns {{ node: string[]; nodeCore: string[]; nodeRuntime: string[]; dom: string[]; e2e: string[]; types: string[] }}
 */
export function testGlobs(root) {
    const packages = workspacePackages(root);
    const testsOf = (layers, extensions) =>
        packages
            .filter((each) => layers.includes(each.layer))
            .map((each) => `packages/${each.dir}/tests/**/*.test.${extensions}`);
    const nodeCore = testsOf(['pure'], 'ts');
    const nodeRuntime = [
        'apps/*/tests/unit-node/**/*.test.ts',
        ...testsOf(['platform'], 'ts'),
        'tools/tests/**/*.test.mjs',
    ];

    return {
        node: [
            'apps/*/tests/unit-node/**/*.test.ts',
            ...testsOf(['pure', 'platform'], 'ts'),
            'tools/tests/**/*.test.mjs',
        ],
        nodeCore,
        nodeRuntime,
        dom: ['apps/*/tests/unit-dom/**/*.test.{ts,tsx}', ...testsOf(['dom'], '{ts,tsx}')],
        // Playwright's own default, inside the folder each app's config points it at.
        e2e: ['apps/*/tests/e2e/**/*.{spec,test}.{ts,tsx}'],
        types: ['packages/*/tests/**/*.test-d.{ts,tsx}', 'apps/*/tests/**/*.test-d.{ts,tsx}'],
    };
}
