import { rm } from 'node:fs/promises';

import { FileReadError } from '../disk/file-read-error.js';
import { docFile } from './doc-path.js';

/** Removes one doc and refuses a name that names nothing. */
export async function deleteDoc(root: string, workspaceId: string, name: string): Promise<void> {
    const path = docFile(root, workspaceId, name);

    try {
        await rm(path);
    } catch (error) {
        throw new FileReadError({ path, message: String(error) });
    }
}
