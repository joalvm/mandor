/**
 * The gates read the source of every package and app, and nothing else: a rule about how the
 * interface is drawn has no business with a build artifact or a dependency.
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, sep } from 'node:path';

const ROOTS = ['packages', 'apps'];

/** Paths are compared and reported in one spelling, whatever the machine writes them in. */
function posix(path) {
    return path.split(sep).join('/');
}

async function entriesOf(directory, recursive) {
    try {
        return await readdir(directory, { recursive, withFileTypes: true });
    } catch {
        return [];
    }
}

async function filesOf(source) {
    const files = [];

    for (const entry of await entriesOf(source, true)) {
        if (entry.isFile()) {
            const path = join(entry.parentPath, entry.name);

            files.push({ path: posix(path), text: await readFile(path, 'utf8') });
        }
    }

    return files;
}

async function sourceOf(root) {
    const members = (await entriesOf(root, false)).filter((entry) => entry.isDirectory());
    const files = [];

    for (const member of members) {
        files.push(...(await filesOf(join(root, member.name, 'src'))));
    }

    return files;
}

/** Every source file of every package and app, with its repo-relative path. */
export async function sourceFiles() {
    const files = [];

    for (const root of ROOTS) {
        files.push(...(await sourceOf(root)));
    }

    return files;
}
