import { initRepo } from '@mandor/git';
import { createWorkspace, writeRepoTree } from '@mandor/store-fs';

import {
    copiedRepo,
    type RepoCopy,
} from '../../../../../../../packages/host/tests/support/copied-repo.js';

/** The workspace every connection test speaks about. */
const WORKSPACE = { id: 'api-de-pagos', name: 'API de pagos', kind: 'async' } as const;

/**
 * A repo with one workspace and nothing pending, built once for the file and copied for each
 * test. Called at the top of the file, where hooks register.
 */
export function connectionRepo(): RepoCopy {
    return copiedRepo(async (root) => {
        await writeRepoTree(root, 'Demo');
        await createWorkspace(root, WORKSPACE);
        await initRepo(root);
    });
}
