import { parseWorkspace, type Workspace } from '@mandor/schema';

import { readOrThrow } from '../disk/read-or-throw.js';
import { writeDocument } from '../disk/write-document.js';
import { workspaceFile } from './workspace-path.js';

/**
 * Renames one workspace: the name moves, the id and the directory stay. The file is read
 * first so comments and keys no reader knows about survive the write.
 */
export async function renameWorkspace(
    root: string,
    workspaceId: string,
    name: string,
): Promise<Workspace> {
    const read = await readOrThrow(workspaceFile(root, workspaceId), parseWorkspace);
    const renamed: Workspace = { ...read.value, name };

    await writeDocument(workspaceFile(root, workspaceId), read.document, { name });

    return renamed;
}
