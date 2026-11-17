/**
 * What a check is allowed to look at. A plan asserts over source, never over what a build left
 * behind: `dist` holds yesterday's answer to today's question, and a check that reads it passes
 * for a reason nobody wrote down.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

const SKIPPED = new Set(['node_modules', 'dist', 'out', 'coverage', '.git', 'test-results']);

/** Paths are compared and reported in one spelling, whatever the machine writes them in. */
function posix(path) {
    return path.split(sep).join('/');
}

function walk(directory, found) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);

        if (entry.isDirectory() && !SKIPPED.has(entry.name)) {
            walk(path, found);
        }

        if (entry.isFile()) {
            found.push(posix(path));
        }
    }

    return found;
}

/** True when the path is there at all, whatever kind of thing it is. */
export function present(path) {
    try {
        statSync(path);

        return true;
    } catch {
        return false;
    }
}

/** Every file the target names: one, when it is a file; all of them, when it is a directory. */
export function filesUnder(target) {
    if (!present(target)) {
        return [];
    }

    if (statSync(target).isFile()) {
        return [posix(target)];
    }

    return walk(target, []);
}

/** The text of a file, or an empty string when there is nothing there to read. */
export function textOf(path) {
    try {
        return readFileSync(path, 'utf8');
    } catch {
        return '';
    }
}
