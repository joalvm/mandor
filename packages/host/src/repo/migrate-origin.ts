import { listConflicts, migrateRepoFormat, needsFormatMigration } from '@mandor/store-fs';

import { repoRelative } from './repo-relative.js';
import { reshapeRepo } from './reshape-repo.js';

/**
 * Brings an origin to the current format with a commit of its own, when it has something to
 * migrate. Asked when the origin opens and after a sync that brought changes, since a merge
 * with a machine that never migrated can bring the old key back. A clash waiting for a person
 * stops it: what the files say is not settled yet. An origin whose repo file cannot be read is
 * left for the load to report. Answers the files it changed, from the root of the repo.
 */
export async function migrateOrigin(root: string): Promise<string[]> {
    if (!(await canMigrate(root))) {
        return [];
    }

    const files = await reshapeRepo(
        {
            root,
            paths: (written: string[]) => written.map((file) => repoRelative(root, file)),
            change: { kind: 'migrate-format' },
        },
        () => migrateRepoFormat(root),
    );

    return files.map((file) => repoRelative(root, file));
}

async function canMigrate(root: string): Promise<boolean> {
    if ((await listConflicts(root)).conflicts.length > 0) {
        return false;
    }

    return needsFormatMigration(root).catch(() => false);
}
