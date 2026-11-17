import { rm } from 'node:fs/promises';

import { FileReadError } from '../disk/file-read-error.js';
import { connectionFile } from './connection-path.js';

/**
 * Takes a connection off the disk. The file is never parsed on the way out: a connection the
 * domain would reject is exactly the one the user wants gone. A file that is not there is a
 * refusal and not a silent success, because an id that matched nothing is a mistake upstream.
 */
export async function deleteConnection(
    root: string,
    workspaceId: string,
    connectionId: string,
): Promise<void> {
    const path = connectionFile(root, workspaceId, connectionId);

    try {
        await rm(path);
    } catch (error) {
        throw new FileReadError({ path, message: String(error) });
    }
}
