import { readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * @typedef {{ statements: number, branches: number, functions: number, lines: number }} Coverage
 */

/**
 * The coverage gate of one pure package, as the globs the runner measures it by. Vitest measures a
 * file against every glob that names it, so a folder with a floor of its own cannot also sit
 * inside the glob of its package: the package is then written entry by entry, the folder apart.
 *
 * @param {string} root the root of the repository
 * @param {string} dir the folder of the package under `packages/`
 * @param {Readonly<Record<string, { floor: Coverage }>>} below the floors, by package or by `package/src/folder`
 * @param {Coverage} full the gate everything without a floor keeps
 * @returns {Array<[string, Coverage]>}
 */
export function packageThresholds(root, dir, below, full) {
    const folders = Object.keys(below).filter((key) => key.startsWith(`${dir}/`));

    if (folders.length === 0) {
        return [[`packages/${dir}/**`, below[dir]?.floor ?? full]];
    }

    const carved = new Set(folders.map((key) => key.slice(dir.length + 1)));
    const rest = readdirSync(join(root, 'packages', dir, 'src'), { withFileTypes: true })
        .sort((one, other) => one.name.localeCompare(other.name))
        .filter((entry) => !carved.has(`src/${entry.name}`))
        .map((entry) => [
            `packages/${dir}/src/${entry.name}${entry.isDirectory() ? '/**' : ''}`,
            full,
        ]);
    const floors = folders.map((key) => [`packages/${key}/**`, below[key]?.floor ?? full]);

    return [...rest, ...floors];
}
