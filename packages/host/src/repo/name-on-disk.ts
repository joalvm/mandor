import { join } from 'node:path';

import { entityOfPath, nameInText, readFileText, workspaceFile } from '@mandor/store-fs';

import { repoRelative } from './repo-relative.js';

/** The visible name of a file of the repo, read from disk; `''` when it has none or is gone. */
export async function nameOnDisk(root: string, path: string): Promise<string> {
    const entity = entityOfPath(path);

    // The order of the collections of a workspace has no name of its own: it goes by its workspace.
    if (entity?.area === 'collections' && entity.path === '') {
        return nameOnDisk(root, repoRelative(root, workspaceFile(root, entity.workspaceId)));
    }

    const text = await readFileText(join(root, path)).catch(() => '');

    return nameInText(path, text);
}
