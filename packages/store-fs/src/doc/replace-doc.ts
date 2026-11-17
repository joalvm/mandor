import { mkdir } from 'node:fs/promises';

import { atomicWrite } from '../disk/atomic-write.js';
import { docFile, docsDir } from './doc-path.js';

/**
 * Puts the whole text of one doc on disk, front matter included. A doc that comes from outside —
 * an import— arrives with the title it carries in that front matter, so splicing it under the
 * front of a file that is already there would leave the file with two.
 *
 * The name is checked before the folder is made: a name the domain refuses leaves the workspace
 * exactly as it was. The bytes land through the atomic write of the package, so a reader arriving
 * mid-write sees the old text or the new one, and a crash never leaves half a document behind.
 */
export async function replaceDoc(
    root: string,
    workspaceId: string,
    name: string,
    text: string,
): Promise<void> {
    const path = docFile(root, workspaceId, name);

    await mkdir(docsDir(root, workspaceId), { recursive: true });
    await atomicWrite(path, text);
}
