/**
 * A file that arrives without a test never gets one. Coverage does not fall in a jump, it falls
 * one small file at a time — the three that the audit of the last milestone found uncovered were
 * all under thirty lines, and each looked too small to be worth a test on the day it was written.
 *
 * The rule reads the range of the request, so it asks nothing of what was already there: what a
 * contribution adds is what a contribution answers for.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

const SOURCE = /^(packages|apps)\/[^/]+\/src\/.+\.tsx?$/;
const EXEMPT = [/\.d\.ts$/, /\/index\.ts$/, /\/testing\//];
const SKIPPED = new Set(['node_modules', 'dist', 'out', 'coverage', '.git']);

function walk(directory, found) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);

        if (entry.isDirectory() && !SKIPPED.has(entry.name)) {
            walk(path, found);
        }

        if (entry.isFile()) {
            found.push(path.split(sep).join('/'));
        }
    }

    return found;
}

/** What the tests of a package say, and what they are called: a name is written in both. */
function textUnder(root) {
    try {
        statSync(root);
    } catch {
        return '';
    }

    return walk(root, [])
        .flatMap((path) => [path, readFileSync(path, 'utf8')])
        .join('\n');
}

/**
 * Whether the tests of the package name the file, by the name it goes by. Naming it is mentioning
 * it — importing the module, or writing its name in a line of the test — and it is also calling
 * the test after it: `tests/` mirrors `src/` and a package imports through its barrel, so for a
 * module the barrel republishes the mirrored file name is the whole of the link.
 */
function named(path) {
    const parts = path.split('/');
    const base = parts.at(-1).replace(/\.tsx?$/, '');

    return textUnder(`${parts[0]}/${parts[1]}/tests`).includes(base);
}

function covered(path) {
    return EXEMPT.some((exempt) => exempt.test(path)) || named(path);
}

/**
 * @param {readonly string[]} added paths this request adds, as `git diff --diff-filter=A` gives
 * them
 */
export function newFileTestProblems(added) {
    return added
        .filter((path) => SOURCE.test(path))
        .filter((path) => !covered(path))
        .map(
            (path) => `\`${path}\` is new and no test of its package names it. New file, new test`,
        );
}
