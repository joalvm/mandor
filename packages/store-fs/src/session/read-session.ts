import { parse } from 'yaml';

import { readTextOrNull } from '../disk/read-text.js';
import { sessionFile } from './session-path.js';

/**
 * Reads untrusted session data; the IPC owner validates its own contract. A file that is not
 * YAML is no state, like a missing one: the origin opens without its layout instead of not at
 * all. One that is there and cannot be read still fails.
 */
export async function readSession(root: string): Promise<unknown> {
    const source = await readTextOrNull(sessionFile(root));

    if (source === null) {
        return undefined;
    }

    try {
        return parse(source) as unknown;
    } catch {
        return undefined;
    }
}
