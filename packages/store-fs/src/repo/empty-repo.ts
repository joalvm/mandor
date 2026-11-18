import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { parseRepo } from '@mandor/schema';

import { readOrThrow } from '../disk/read-or-throw.js';
import { writeDocument } from '../disk/write-document.js';
import { repoFile, workspacesDir } from './repo-path.js';

/**
 * Leaves the repo without workspaces: their directories go, and the order they were listed in
 * goes with them. The repo itself stays; emptying is not removing.
 */
export async function emptyRepo(root: string): Promise<void> {
    const { document } = await readOrThrow(repoFile(root), parseRepo);
    const entries = await readdir(workspacesDir(root), { withFileTypes: true });

    await Promise.all(
        entries
            .filter((entry) => entry.isDirectory())
            .map((entry) =>
                rm(join(workspacesDir(root), entry.name), { force: true, recursive: true }),
            ),
    );
    await writeDocument(repoFile(root), document, { workspaces: [] });
}
