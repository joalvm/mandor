/**
 * The vocabulary a plan uses to state what «done» means. Eight verbs, no shell: a check is data
 * the gate reads, never a command a document gets to run. What cannot be said with these is not
 * a fidelity check but a test, and tests already have a place to live.
 */

import { filesUnder, present, textOf } from './tree-files.mjs';

function anyMatch(target, expression) {
    return filesUnder(target).some((path) => new RegExp(expression).test(textOf(path)));
}

/**
 * Whether anything under the tests of the package names this file. A mirror by file name would
 * be the stricter rule and the wrong one: `packages/ui` groups its tests by theme, so the test
 * that exercises `SplitPane` is called `structure.test.tsx` and still tests it.
 */
function testsNaming(source) {
    const parts = source.split('/');
    const base = parts.at(-1).replace(/\.tsx?$/, '');
    const root = `${parts[0]}/${parts[1]}/tests`;

    // Calling the test after the file names it too, as `new-file-tests.mjs` reads it for QA.
    return filesUnder(root).filter((path) => path.includes(base) || textOf(path).includes(base));
}

export const VERBS = {
    file: (target) => (present(target) ? undefined : `\`${target}\` is not there`),
    'no-file': (target) => (present(target) ? `\`${target}\` is still there` : undefined),
    contains: (target, value) =>
        textOf(target).includes(value) ? undefined : `\`${target}\` does not say ${value}`,
    absent: (target, value) =>
        textOf(target).includes(value) ? `\`${target}\` still says ${value}` : undefined,
    matches: (target, value) =>
        anyMatch(target, value) ? undefined : `nothing under \`${target}\` matches ${value}`,
    'no-match': (target, value) =>
        anyMatch(target, value)
            ? `something under \`${target}\` still matches ${value}`
            : undefined,
    exports: (target, value) => {
        const barrel = `packages/${target.replace('@mandor/', '')}/src/index.ts`;

        return textOf(barrel).includes(value)
            ? undefined
            : `\`${barrel}\` does not export ${value}`;
    },
    tested: (target) =>
        testsNaming(target).length > 0 ? undefined : `no test of the package names \`${target}\``,
};
