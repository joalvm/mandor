import { createRequire } from 'node:module';
import { join } from 'node:path';

import type { Plugin } from 'vite';
import { configDefaults, defineConfig, type TestProjectInlineConfiguration } from 'vitest/config';

import { packageThresholds } from './tools/workspace/coverage-thresholds.mjs';
import { isolatedTests } from './tools/workspace/isolated-tests.mjs';
import { testGlobs } from './tools/workspace/test-globs.mjs';
import { workspacePackages } from './tools/workspace/workspace-packages.mjs';

// A timeout is a ceiling for a hang, not a wait for a result. These tests spawn real `git`, write
// real directories and read every source file of the repository, so what they take is the speed of
// the machine underneath, and the ceiling that comes by default is measured on a desk with cores to
// spare. On the two busy cores of a runner the same passing test crosses five seconds and the run
// turns red over the machine rather than over the code. The ceiling rises to where only a hang
// reaches it; a green run never touches it.
//
// It lives here and not in the block below because a project does not inherit the budget of the
// file it is written in: each one carries its own or takes the default back.
const BUDGET = {
    testTimeout: 30_000,
    hookTimeout: 30_000,
} as const;

// A test that asserts nothing passes whatever the code does: one that only calls, one whose
// `expect` sits in a callback that never runs, one whose loop had nothing to walk. Each test has
// to reach at least one assertion, or it fails saying so. Inherited the same way as the budget.
//
// `expect.poll` waits for a condition, and the second it gives up after by default is a clock
// again: two real commits on a busy Windows machine cross it while the code is fine. Its ceiling
// rises like the budget above; a poll still ends the moment its condition holds.
const STRICT = { expect: { requireAssertions: true, poll: { timeout: 10_000 } } } as const;

// A fake clock leaves the frames of the window alone. The editor keeps one queue of frames for the
// whole window and asks for the next frame only once the last one came: a frame asked for on a fake
// clock that the test then gives back never comes, and no editor drawn after it in that worker paints
// a line again. The frames run on the real clock (`tools/vitest/frames.ts`); a test that wants them
// faked names them in its own `toFake`. The rest is what the fake clock fakes by default.
const FAKE_CLOCK: NonNullable<Project['test']['fakeTimers']> = {
    ...configDefaults.fakeTimers,
    toFake: [
        'setTimeout',
        'clearTimeout',
        'setImmediate',
        'clearImmediate',
        'setInterval',
        'clearInterval',
        'Date',
        'requestIdleCallback',
        'cancelIdleCallback',
        'performance',
        'hrtime',
    ],
};

// graphql ships as ES modules and as CommonJS, and the language service asks for the CommonJS copy
// while a test would import the ES one: two copies of the same classes, and the first `instanceof`
// between them throws. Pointing the test at the file Node's own `require` finds leaves one copy. The
// bundler of an app resolves the service through its ES entry and never sees the problem.
const GRAPHQL_COPY = [
    { find: /^graphql$/, replacement: createRequire(import.meta.url).resolve('graphql') },
];

// Node has no desktop runtime, and the tests that run there never need its binary: what they get
// for `electron` is in `tools/vitest/electron.ts`.
const NO_ELECTRON = [
    { find: /^electron$/, replacement: join(import.meta.dirname, 'tools/vitest/electron.ts') },
];

// The code makes its stores with zustand, and in the dom project it gets the zustand of
// `tools/vitest/stores.ts`, which writes each store down so the setup can give every file the stores a
// fresh module graph would. Only the code is pointed there: the wrapper itself and the packages
// under `node_modules` keep the real one.
const STORES = join(import.meta.dirname, 'tools/vitest/stores.ts').replaceAll('\\', '/');

const trackedStores: Plugin = {
    name: 'mandor:tracked-stores',
    enforce: 'pre',
    resolveId(source, importer) {
        const from = importer?.replaceAll('\\', '/') ?? STORES;

        if (!/^zustand(?:\/vanilla)?$/u.test(source) || from === STORES) {
            return null;
        }

        return from.includes('/node_modules/') ? null : STORES;
    },
};

const PACKAGES = workspacePackages(import.meta.dirname);

// The pure core carries a numeric gate, and the gate is 100. A package below it says so here,
// with the number it holds today and why, and the plan that next touches it raises the number.
// A package in neither place has no gate at all, and that is what the dom and the platform get:
// a number there rewards empty render tests.
type Coverage = { statements: number; branches: number; functions: number; lines: number };

const COVERAGE_BELOW_FULL: Record<string, { floor: Coverage; reason: string }> = {
    // Raised when it gained isRecord and irEqual stopped counting undefined keys. Raised again
    // when a second format reaches the report and the plan. Raised again when the workspace
    // gained its HTTP side (2026-10-02): the walk of the HTTP diff keeps branches only the
    // writer of a format exercises end to end.
    'interop-core': {
        floor: { statements: 96, branches: 92, functions: 99, lines: 96 },
        reason: 'the report, the plan and the HTTP diff carry cases only a format writer reaches end to end',
    },
    // A floor may sit on one folder of a package: the rest of the package keeps the full gate.
    // Raised when it was split by direction. Raised again when 2.x fixtures reach the fallbacks.
    'interop-formats/src/asyncapi': {
        floor: { statements: 95, branches: 85, functions: 98, lines: 95 },
        reason: 'the 2.x reader keeps fallbacks for shapes the fixtures do not carry',
    },
    // Measured at birth, running its own tests (2026-09-29). Every line of logic is covered; what
    // the number still owes is structural: the contract files the plan's phase checks demand
    // (`SyncRequest`, `SyncResponse`, `BodySpill`, `SyncTimings`…) carry no statements to run, and
    // the send keeps guards for abort races that only a real network answers.
    'transport-sync': {
        floor: { statements: 98, branches: 93, functions: 96, lines: 98 },
        reason: 'the contract files carry no statements and the send guards abort races only real network reaches',
    },
};

const FULL: Coverage = { statements: 100, branches: 100, functions: 100, lines: 100 };

function coverageThresholds(): Record<string, Coverage> {
    return Object.fromEntries(
        PACKAGES.filter((each) => each.layer === 'pure').flatMap((each) =>
            packageThresholds(import.meta.dirname, each.dir, COVERAGE_BELOW_FULL, FULL),
        ),
    );
}

// Where each project looks. The guard of the test files reads the same lists, and fails on a file
// that reads like a test and that neither project picks up.
const TESTS = testGlobs(import.meta.dirname);

type Project = TestProjectInlineConfiguration & { test: { name: string } };

// What a test file costs is mostly what it loads: the window, React, the editor, every package
// it imports. Loaded again for each of five hundred files, on two cores, that was most of the run.
// So the files of a worker share their modules and their window, and the setup gives each file a
// clean start of what it would otherwise inherit. A file that cannot share says so, and runs in a
// fresh module graph of its own: the rule that finds it is in `isolated-tests.mjs`.
function shareModules(project: Project, tests: string[]): Project[] {
    const alone = isolatedTests(import.meta.dirname, tests);

    return [
        {
            ...project,
            test: {
                ...project.test,
                include: tests,
                exclude: [...configDefaults.exclude, ...alone],
                env: { ...project.test.env, MANDOR_SHARED_MODULES: 'true' },
                isolate: false,
                pool: 'threads',
            },
        },
        {
            ...project,
            test: {
                ...project.test,
                name: `${project.test.name}-isolated`,
                include: alone,
                isolate: true,
                pool: 'threads',
            },
        },
    ];
}

// One runner for the whole monorepo, split by environment. Pure packages and the platform run in
// node so a test never depends on a DOM that production does not have; packages that draw with
// react run in jsdom. The split is by package, read from its manifest, not by file, so a test
// cannot end up in the wrong environment by accident and a new package cannot end up in none.
export default defineConfig({
    test: {
        coverage: {
            provider: 'v8',
            // Coverage measures the pure core, the only place it carries a gate, and it runs
            // with the node tests, which are the core's own: a number elsewhere would be paid
            // for on every run and read by nobody. A helper that exists to arrange a test is
            // not production code either: the `testing` folder of a package reaches tests
            // through its own export and never enters an app bundle.
            include: PACKAGES.filter((each) => each.layer === 'pure').map(
                (each) => `packages/${each.dir}/src/**`,
            ),
            exclude: ['packages/*/src/testing/**'],
            // What falls short is what a reader needs; a file at full coverage is noise.
            reporter: [['text', { skipFull: true }]],
            thresholds: coverageThresholds(),
        },
        // How many files run at once. The default leaves one core free, which on a two-core
        // machine leaves one worker: the suite runs one file at a time while half the machine
        // waits, and the wait grows with every test added. A run owns the machine it was given,
        // on a runner and on a desk alike, so it takes all of it.
        maxWorkers: '100%',
        projects: [
            // V8 collects execution even outside the report's include globs. Keep the pure
            // packages' own tests separate so integrations do not pay for coverage or supply it.
            ...(['node', 'node-core'] as const).flatMap((name) =>
                shareModules(
                    {
                        resolve: { alias: [...GRAPHQL_COPY, ...NO_ELECTRON] },
                        test: {
                            name,
                            environment: 'node',
                            ...BUDGET,
                            ...STRICT,
                            setupFiles: [
                                './tools/vitest/hygiene.ts',
                                './tools/vitest/timers.ts',
                                './tools/vitest/regexp.ts',
                                './tools/vitest/main.ts',
                            ],
                        },
                    },
                    name === 'node-core' ? TESTS.nodeCore : TESTS.nodeRuntime,
                ),
            ),
            ...shareModules(
                {
                    plugins: [trackedStores],
                    resolve: { alias: GRAPHQL_COPY },
                    test: {
                        name: 'dom',
                        environment: 'jsdom',
                        ...BUDGET,
                        ...STRICT,
                        globals: true,
                        // The setup registers Testing Library's cleanup for every file; left on,
                        // the library would register it once more, for the first file only.
                        env: { RTL_SKIP_AUTO_CLEANUP: 'true' },
                        fakeTimers: FAKE_CLOCK,
                        setupFiles: [
                            './tools/vitest/hygiene.ts',
                            './tools/vitest/timers.ts',
                            './tools/vitest/regexp.ts',
                            './tools/vitest/frames.ts',
                            './tools/vitest/setup.ts',
                        ],
                    },
                },
                TESTS.dom,
            ),
        ],
    },
});
