import { type Globals, parseGlobals } from '@mandor/schema';

import { fileExists } from '../disk/file-exists.js';
import { readOrThrow } from '../disk/read-or-throw.js';
import { globalsFile } from '../repo/repo-path.js';

/**
 * The globals of an origin. An origin that never saved one has none: the file is born with the
 * first write. A file that is there and cannot be read is a refusal, as with an environment.
 */
export async function readGlobals(root: string): Promise<Globals> {
    const path = globalsFile(root);

    if (!(await fileExists(path))) {
        return { variables: [] };
    }

    return (await readOrThrow(path, parseGlobals)).value;
}
