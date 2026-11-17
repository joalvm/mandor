import { rm } from 'node:fs/promises';

import { cookieJarFile } from '../cookies/cookie-jar-path.js';
import { FileReadError } from '../disk/file-read-error.js';
import { environmentFile } from './environment-path.js';

/**
 * Removes one environment file and refuses an id that names nothing. The cookies a server set
 * for it go first: a jar left behind would belong to nothing, and one that goes while the file
 * stays only costs a new login.
 */
export async function deleteEnvironment(
    root: string,
    workspaceId: string,
    environmentId: string,
): Promise<void> {
    const path = environmentFile(root, workspaceId, environmentId);

    await rm(cookieJarFile(root, workspaceId, environmentId), { force: true });

    try {
        await rm(path);
    } catch (error) {
        throw new FileReadError({ path, message: String(error) });
    }
}
