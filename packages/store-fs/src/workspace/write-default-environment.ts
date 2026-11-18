import { parseWorkspace, slugSchema } from '@mandor/schema';

import { readOrThrow } from '../disk/read-or-throw.js';
import { writeDocument } from '../disk/write-document.js';
import { workspaceFile } from './workspace-path.js';

/**
 * Writes the environment a workspace takes when nobody chose one, or takes it out with `null`.
 * Only that key changes: the rest of the file, comments included, stays as it was.
 */
export async function writeDefaultEnvironment(
    root: string,
    workspaceId: string,
    environmentId: string | null,
): Promise<void> {
    const file = workspaceFile(root, workspaceId);
    const read = await readOrThrow(file, parseWorkspace);
    const id = environmentId === null ? undefined : slugSchema.parse(environmentId);

    await writeDocument(file, read.document, { defaultEnvironment: id });
}
