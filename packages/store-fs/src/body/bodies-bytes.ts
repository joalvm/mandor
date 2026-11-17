import { stat } from 'node:fs/promises';
import { join } from 'node:path';

import { namesOrNone } from '../disk/directory-entries.js';
import { bodiesDir } from './body-path.js';

/** The size of one file of the store; one gone since the listing holds nothing. */
async function sizeOrNone(file: string): Promise<number> {
    try {
        return (await stat(file)).size;
    } catch {
        return 0;
    }
}

/**
 * How many bytes the store of bodies holds, the temporary file of a spill under way included.
 * Measured by listing, without opening a body or an entry of the history.
 */
export async function bodiesBytes(root: string): Promise<number> {
    const dir = bodiesDir(root);
    const names = await namesOrNone(dir);
    const sizes = await Promise.all(names.map((name) => sizeOrNone(join(dir, name))));

    return sizes.reduce((sum, size) => sum + size, 0);
}
