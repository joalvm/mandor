import type { AuthConfig } from '@mandor/schema';

import { fileExists } from '../disk/file-exists.js';
import { FileReadError } from '../disk/file-read-error.js';
import { writeDocument } from '../disk/write-document.js';
import { readWorkspace } from '../workspace/read-workspace.js';
import { workspaceFile } from '../workspace/workspace-path.js';

/**
 * Writes the auth of a workspace. A file that is not there is not ours to start, so writing auth
 * refuses instead of inventing the rest. `null` takes the key out.
 */
export async function writeAuth(
    root: string,
    workspaceId: string,
    auth: AuthConfig | null,
): Promise<void> {
    const file = workspaceFile(root, workspaceId);
    const existing = await readWorkspace(root, workspaceId);

    if (existing.ok) {
        await writeDocument(file, existing.document, { auth: auth ?? undefined });

        return;
    }

    if (await fileExists(file)) {
        throw new FileReadError(existing.warning);
    }

    throw new FileReadError({ path: file, message: 'workspace.yaml is not there' });
}
