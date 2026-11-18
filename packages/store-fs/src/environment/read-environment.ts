import { type Environment, parseEnvironment } from '@mandor/schema';

import { readOrThrow } from '../disk/read-or-throw.js';
import { environmentFile } from './environment-path.js';

/** Reads one environment. A file that cannot be loaded is a refusal, not an empty one. */
export async function readEnvironment(
    root: string,
    workspaceId: string,
    environmentId: string,
): Promise<Environment> {
    const read = await readOrThrow(
        environmentFile(root, workspaceId, environmentId),
        parseEnvironment,
    );

    return read.value;
}
