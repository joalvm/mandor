import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE = /\.(?:ts|tsx|css|mjs)$/;

function filesUnder(directory) {
    return readdirSync(directory, { recursive: true, encoding: 'utf8' })
        .filter((entry) => SOURCE.test(entry) && !entry.includes('node_modules'))
        .map((entry) => join(directory, entry).replaceAll('\\', '/'))
        .sort();
}

/**
 * The files a list of paths stands for. The formatter and the linter walk a folder by themselves;
 * the search for related tests compares file names, and a folder named there matches nothing.
 *
 * @param {readonly string[]} paths files and folders, in any mix
 * @returns {string[]}
 */
export function sourcesIn(paths) {
    return paths.flatMap((path) =>
        statSync(path, { throwIfNoEntry: false })?.isDirectory() === true
            ? filesUnder(path)
            : [path],
    );
}
