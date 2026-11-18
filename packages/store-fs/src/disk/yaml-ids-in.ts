import { SEGMENT } from '@mandor/schema';

import { namesOrNone } from './directory-entries.js';

const EXTENSION = '.yaml';

/**
 * The ids a directory of YAML files already holds, read from the file names, sorted. The name
 * is the id, so a file the parser would reject still counts: a new entity must never be given
 * its name. A directory that does not exist yet holds none; one that cannot be read fails.
 */
export async function yamlIdsIn(directory: string): Promise<string[]> {
    const names = await namesOrNone(directory);

    return names
        .filter((name) => name.endsWith(EXTENSION))
        .map((name) => name.slice(0, -EXTENSION.length))
        .filter((id) => SEGMENT.test(id))
        .toSorted();
}
