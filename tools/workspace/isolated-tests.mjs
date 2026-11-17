import { globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The files of a worker share their modules: a module loads once, for the first file that asks.
 * Three kinds of test file cannot live with that. One that replaces a module (`vi.mock`,
 * `vi.doMock`) would hand its stand-in to every file after it. One that throws the module graph
 * away (`vi.resetModules`) would make every file after it load it all again. And one that tests
 * a module from its very first load, or a window nobody touched, says so with a reason:
 * `// isolation-policy: <why>`. Those run in a fresh module graph each; the rest share one.
 */
const ISOLATION = /\bvi\.(?:mock|doMock|resetModules)\(|\/\/ isolation-policy: \S/u;

/**
 * @param {string} root
 * @param {readonly string[]} patterns globs of test files, relative to `root`
 * @returns {string[]} the files that run alone, relative to `root`, with `/` on every system
 */
export function isolatedTests(root, patterns) {
    return globSync(patterns, { cwd: root })
        .map((file) => file.replaceAll('\\', '/'))
        .filter((file) => ISOLATION.test(readFileSync(join(root, file), 'utf8')))
        .sort();
}
