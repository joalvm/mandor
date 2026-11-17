/**
 * The loop check: what is worth running while a change is still being written.
 *
 * `verify` is the closing gate. It formats the whole tree, rebuilds every generated file to
 * compare it, walks every rule, runs every test with coverage and builds both apps. It answers
 * "is this branch shippable", and it takes minutes. Asking that question after each edit spends
 * the minutes without buying an answer better than the one this gives in seconds.
 *
 * So this runs only the part that can disagree with the edit in hand — the formatter, the
 * linter, the design rules, the types, and the tests that reach the files named. What it cannot
 * catch (generated files out of date, coverage floors, the build) is what `verify` is for, and
 * `verify` still has to pass before the branch is offered to anyone.
 *
 * Usage: `npm run check -- <path>...` — sources or tests, in any mix. With no path it checks
 * what the working tree has changed.
 */

import { execFileSync } from 'node:child_process';
import { relative } from 'node:path';

import { createVitest } from 'vitest/node';

import { sourcesIn } from './check-sources.mjs';

/**
 * Every step is a node program run by path. The `.cmd` shims npm installs need a shell, and a
 * shell would read these file names as script rather than as arguments.
 */
const BIN = {
    eslint: 'node_modules/eslint/bin/eslint.js',
    prettier: 'node_modules/prettier/bin/prettier.cjs',
    vitest: 'node_modules/vitest/vitest.mjs',
};

const CHECKABLE = /\.(?:ts|tsx|css|mjs)$/;

function run(args) {
    execFileSync(process.execPath, args, { stdio: 'inherit' });
}

/** What the working tree has changed, when the caller named nothing. */
function changedFiles() {
    const status = execFileSync('git', ['status', '--porcelain=v1'], { encoding: 'utf8' });

    return status
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => line.slice(3).trim())
        .filter((path) => CHECKABLE.test(path));
}

const named = process.argv.slice(2);
const files = named.length > 0 ? named : changedFiles();

if (files.length === 0) {
    console.log('check: the working tree has changed no file this can check.');
    process.exit(0);
}

/**
 * The tests that reach the files named. They are looked for here and run apart: `vitest related`
 * does both in one process, and its walk of the module graph leaves windows of a test uncleaned
 * for the next one, a red that no other run of the same files in the same order shows.
 */
async function relatedTests(sources) {
    const vitest = await createVitest('test', { related: sources, run: true, watch: false });

    try {
        const found = await vitest.getRelevantTestSpecifications();

        return [...new Set(found.map(({ moduleId }) => relative(process.cwd(), moduleId)))];
    } finally {
        await vitest.close();
    }
}

console.log(`check: ${String(files.length)} file(s).`);

run([BIN.prettier, '--write', ...files]);
run([BIN.eslint, ...files]);
run(['tools/design/check-design.mjs']);
run(['tools/typecheck.mjs']);
const tests = await relatedTests(sourcesIn(files));

// With no file named, the runner would take it as a request for every test there is.
if (tests.length > 0) {
    run([BIN.vitest, 'run', ...tests]);
}

console.log('check: the loop is clean. `npm run verify` before the branch leaves your hands.');
